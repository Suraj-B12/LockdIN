"""Lock In Together — live co-focus rooms.

Body-doubling without video or websockets: a host opens a room, friends join by
a short code, and everyone polls GET /{id} to see who's "locked in now" (presence
derived from a recent `last_seen` heartbeat) plus a combined focus tally. Free-
tier-safe: short-TTL-friendly reads, no persistent connections, no Redis.

The endpoints assume migration_007 (rooms + room_participants). GET /active fails
safe (returns null) if the tables don't exist yet, so the rest of the app is
never affected before the migration is run.
"""

import secrets
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from middleware.auth import get_current_user, valid_uuid
from services.supabase_client import get_supabase
from services.cache import rate_limit_ok
from models.schemas import RoomResponse, RoomJoin, RoomHeartbeat

router = APIRouter(prefix="/api/rooms", tags=["Rooms"])

# Presence: a participant is "live" if their last heartbeat was within this window.
_LIVE_WINDOW_SECONDS = 45
# A room is reachable via /active only if created within this window (avoids
# resurrecting ancient rooms; cheap stand-in for a cleanup cron).
_ROOM_MAX_AGE_HOURS = 8
# Unambiguous join-code alphabet (no O/0/I/1/L).
_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


def _gen_code(n: int = 6) -> str:
    return "".join(secrets.choice(_CODE_ALPHABET) for _ in range(n))


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse(ts) -> datetime | None:
    if not ts:
        return None
    try:
        return datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


def _build_room(db, room: dict, requester_id: str) -> dict:
    """Assemble a RoomResponse dict from a room row (+ its participants)."""
    parts = db.table("room_participants") \
        .select("user_id, status, focus_seconds, last_seen") \
        .eq("room_id", room["id"]) \
        .execute()

    rows = [p for p in (parts.data or []) if p.get("status") != "left"]
    ids = [p["user_id"] for p in rows]

    profile_map = {}
    if ids:
        profs = db.table("profiles").select("id, display_name, avatar_url").in_("id", ids).execute()
        profile_map = {p["id"]: p for p in (profs.data or [])}

    now = _now()
    participants = []
    combined = 0
    live_count = 0
    for p in rows:
        prof = profile_map.get(p["user_id"], {})
        seen = _parse(p.get("last_seen"))
        live = bool(seen and (now - seen) <= timedelta(seconds=_LIVE_WINDOW_SECONDS))
        combined += p.get("focus_seconds") or 0
        if live:
            live_count += 1
        participants.append({
            "user_id": p["user_id"],
            "display_name": prof.get("display_name", "Someone"),
            "avatar_url": prof.get("avatar_url"),
            "status": p.get("status", "joined"),
            "focus_seconds": p.get("focus_seconds") or 0,
            "live": live,
        })

    # Live + focusing first, then by contribution.
    participants.sort(key=lambda x: (x["live"], x["focus_seconds"]), reverse=True)

    return {
        "id": room["id"],
        "code": room["code"],
        "host_id": room["host_id"],
        "status": room["status"],
        "created_at": room["created_at"],
        "started_at": room.get("started_at"),
        "is_host": room["host_id"] == requester_id,
        "combined_seconds": combined,
        "live_count": live_count,
        "participants": participants,
    }


def _require_participant(db, room_id: str, user_id: str) -> dict:
    """Fetch the room and verify the requester is a (non-left) participant."""
    room_id = valid_uuid(room_id, not_found_detail="Room not found.")
    room = db.table("rooms").select("*").eq("id", room_id).execute()
    if not room.data:
        raise HTTPException(status_code=404, detail="Room not found.")

    part = db.table("room_participants") \
        .select("id, status") \
        .eq("room_id", room_id) \
        .eq("user_id", user_id) \
        .execute()
    if not part.data or part.data[0].get("status") == "left":
        raise HTTPException(status_code=403, detail="Join the room first.")

    return room.data[0]


@router.post("/", response_model=RoomResponse)
async def create_room(user: dict = Depends(get_current_user)):
    """Open a new co-focus room; the host auto-joins. Returns the room + code."""
    if not await rate_limit_ok(f"room:create:{user['id']}", 10):
        raise HTTPException(status_code=429, detail="Slow down — you just opened a room.")

    db = get_supabase()

    # Generate a unique code (retry on the rare collision).
    code = None
    for _ in range(6):
        candidate = _gen_code()
        exists = db.table("rooms").select("id").eq("code", candidate).execute()
        if not exists.data:
            code = candidate
            break
    if not code:
        raise HTTPException(status_code=500, detail="Could not allocate a room code. Try again.")

    created = db.table("rooms").insert({
        "host_id": user["id"],
        "code": code,
        "status": "open",
    }).execute()
    if not created.data:
        raise HTTPException(status_code=500, detail="Could not create the room.")
    room = created.data[0]

    db.table("room_participants").insert({
        "room_id": room["id"],
        "user_id": user["id"],
        "status": "joined",
    }).execute()

    return _build_room(db, room, user["id"])


@router.post("/join", response_model=RoomResponse)
async def join_room(body: RoomJoin, user: dict = Depends(get_current_user)):
    """Join an open/active room by its code (idempotent — rejoin re-activates you)."""
    code = body.code.strip().upper()
    db = get_supabase()

    found = db.table("rooms").select("*").eq("code", code).in_("status", ["open", "active"]).execute()
    if not found.data:
        raise HTTPException(status_code=404, detail="No open room with that code.")
    room = found.data[0]

    existing = db.table("room_participants") \
        .select("id") \
        .eq("room_id", room["id"]) \
        .eq("user_id", user["id"]) \
        .execute()

    if existing.data:
        db.table("room_participants").update({
            "status": "joined",
            "last_seen": _now().isoformat(),
        }).eq("id", existing.data[0]["id"]).execute()
    else:
        try:
            db.table("room_participants").insert({
                "room_id": room["id"],
                "user_id": user["id"],
                "status": "joined",
            }).execute()
        except Exception:
            pass  # concurrent join won the UNIQUE(room_id,user_id) race — fine

    return _build_room(db, room, user["id"])


@router.post("/{room_id}/heartbeat")
async def heartbeat(room_id: str, body: RoomHeartbeat, user: dict = Depends(get_current_user)):
    """Keep the requester 'live' and report focus progress (polled by the client)."""
    db = get_supabase()
    _require_participant(db, room_id, user["id"])

    update = {"last_seen": _now().isoformat()}
    if body.focus_seconds is not None:
        update["focus_seconds"] = body.focus_seconds
    if body.focusing is not None:
        update["status"] = "focusing" if body.focusing else "joined"

    db.table("room_participants").update(update) \
        .eq("room_id", valid_uuid(room_id)) \
        .eq("user_id", user["id"]) \
        .execute()
    return {"ok": True}


@router.get("/{room_id}", response_model=RoomResponse)
async def get_room(room_id: str, user: dict = Depends(get_current_user)):
    """Poll a room: its participants, live presence, and combined focus."""
    db = get_supabase()
    room = _require_participant(db, room_id, user["id"])
    return _build_room(db, room, user["id"])


@router.post("/{room_id}/leave")
async def leave_room(room_id: str, user: dict = Depends(get_current_user)):
    """Leave a room (marks you left; others keep going)."""
    db = get_supabase()
    rid = valid_uuid(room_id, not_found_detail="Room not found.")
    db.table("room_participants").update({"status": "left"}) \
        .eq("room_id", rid).eq("user_id", user["id"]).execute()

    # If the host leaves and no one else is active, close the room.
    room = db.table("rooms").select("host_id, status").eq("id", rid).execute()
    if room.data and room.data[0]["host_id"] == user["id"]:
        remaining = db.table("room_participants").select("id") \
            .eq("room_id", rid).neq("status", "left").execute()
        if not remaining.data:
            db.table("rooms").update({"status": "closed"}).eq("id", rid).execute()

    return {"ok": True}


@router.get("/active/me", response_model=RoomResponse | None)
async def active_room(user: dict = Depends(get_current_user)):
    """The requester's current room (open/active, recent), or null.

    Fails SAFE: any error (e.g. tables not yet migrated) returns null so the
    dashboard/nav never breaks before migration_007 is applied.
    """
    try:
        db = get_supabase()
        cutoff = (_now() - timedelta(hours=_ROOM_MAX_AGE_HOURS)).isoformat()

        mine = db.table("room_participants") \
            .select("room_id, status") \
            .eq("user_id", user["id"]) \
            .neq("status", "left") \
            .execute()
        if not mine.data:
            return None

        room_ids = [m["room_id"] for m in mine.data]
        rooms = db.table("rooms") \
            .select("*") \
            .in_("id", room_ids) \
            .in_("status", ["open", "active"]) \
            .gte("created_at", cutoff) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()
        if not rooms.data:
            return None
        return _build_room(db, rooms.data[0], user["id"])
    except Exception:
        return None
