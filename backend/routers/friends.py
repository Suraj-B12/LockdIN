"""Friend system — add, accept, reject, list friends."""

import asyncio
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from middleware.auth import get_current_user, valid_uuid
from services.supabase_client import get_supabase
from services.cache import rate_limit_ok, cache_delete
from models.schemas import (
    FriendRequest,
    FriendResponse,
    FriendAction,
    FriendActivityResponse,
)
from routers.notifications import notify_friend_request, _get_friend_ids

router = APIRouter(prefix="/api/friends", tags=["Friends"])

# Anti-spam: cap how often a user can fire a NEW friend request to the same
# target, and how fast they can fire requests in general. Repeatedly re-sending
# to someone who rejected (which deletes the row) is the main abuse vector.
_FRIEND_REQ_PER_TARGET_COOLDOWN = 60 * 60  # 1 hour to the same target
_FRIEND_REQ_GLOBAL_COOLDOWN = 5            # >= 5s between any two new requests


@router.get("/", response_model=list[FriendResponse])
async def list_friends(user: dict = Depends(get_current_user)):
    """List all accepted friends with their profile info."""
    db = get_supabase()

    result = db.table("friendships") \
        .select("*, profiles!friendships_friend_id_fkey(display_name, avatar_url)") \
        .eq("user_id", user["id"]) \
        .eq("status", "accepted") \
        .execute()

    # Also get friendships where current user is the friend_id
    reverse = db.table("friendships") \
        .select("*, profiles!friendships_user_id_fkey(display_name, avatar_url)") \
        .eq("friend_id", user["id"]) \
        .eq("status", "accepted") \
        .execute()

    friends = []
    for row in result.data:
        profile = row.pop("profiles", {}) or {}
        row["friend_name"] = profile.get("display_name")
        row["friend_avatar"] = profile.get("avatar_url")
        friends.append(row)

    for row in reverse.data:
        profile = row.pop("profiles", {}) or {}
        friends.append({
            **row,
            "friend_name": profile.get("display_name"),
            "friend_avatar": profile.get("avatar_url")
        })

    return friends


@router.get("/pending", response_model=list[FriendResponse])
async def list_pending_requests(user: dict = Depends(get_current_user)):
    """List incoming friend requests waiting for acceptance."""
    db = get_supabase()

    result = db.table("friendships") \
        .select("*, profiles!friendships_user_id_fkey(display_name, avatar_url)") \
        .eq("friend_id", user["id"]) \
        .eq("status", "pending") \
        .execute()

    friends = []
    for row in result.data:
        profile = row.pop("profiles", {}) or {}
        row["friend_name"] = profile.get("display_name")
        row["friend_avatar"] = profile.get("avatar_url")
        friends.append(row)

    return friends


@router.get("/sent", response_model=list[FriendResponse])
async def list_sent_requests(user: dict = Depends(get_current_user)):
    """List outgoing friend requests the current user has sent and are still pending."""
    db = get_supabase()

    result = db.table("friendships") \
        .select("*, profiles!friendships_friend_id_fkey(display_name, avatar_url)") \
        .eq("user_id", user["id"]) \
        .eq("status", "pending") \
        .execute()

    friends = []
    for row in result.data:
        profile = row.pop("profiles", {}) or {}
        row["friend_name"] = profile.get("display_name")
        row["friend_avatar"] = profile.get("avatar_url")
        friends.append(row)

    return friends


@router.get("/activity", response_model=FriendActivityResponse)
async def friends_activity(
    since: str | None = None,
    user: dict = Depends(get_current_user),
):
    """Recap of what your friends did since `since` (ISO-8601) — powers the
    on-open "while you were gone" inbox.

    For each accepted friend, aggregates their FINISHED sessions since `since`
    (count, focus time, best score, last activity). Friends with nothing since
    `since` come back as idle (`active: false`) so the client can offer a nudge.
    Defaults to the last 7 days when `since` is missing/invalid, and never looks
    back more than 30 days (keeps the query + payload small on the free tier).
    """
    db = get_supabase()
    now = datetime.now(timezone.utc)

    since_dt = None
    if since:
        try:
            since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
            if since_dt.tzinfo is None:
                since_dt = since_dt.replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            since_dt = None
    if since_dt is None:
        since_dt = now - timedelta(days=7)
    floor = now - timedelta(days=30)
    if since_dt < floor:
        since_dt = floor
    if since_dt > now:
        since_dt = now

    friend_ids = await _get_friend_ids(user["id"])
    if not friend_ids:
        return {
            "since": since_dt,
            "generated_at": now,
            "active_count": 0,
            "idle_count": 0,
            "items": [],
        }

    # Friend identities + buddy flavor (one query each, batched by id).
    profs = db.table("profiles").select("id, display_name, avatar_url").in_("id", friend_ids).execute()
    prof_map = {p["id"]: p for p in (profs.data or [])}

    buds = db.table("buddies").select("user_id, buddy_name, buddy_type, mood_level").in_("user_id", friend_ids).execute()
    bud_map = {b["user_id"]: b for b in (buds.data or [])}

    # All friends' finished sessions since `since`, with scores, in one query.
    sess = db.table("sessions") \
        .select("user_id, total_seconds, finished_at, ai_scores(score)") \
        .in_("user_id", friend_ids) \
        .eq("status", "finished") \
        .gte("finished_at", since_dt.isoformat()) \
        .order("finished_at", desc=True) \
        .range(0, 4999) \
        .execute()  # explicit cap (matches PostgREST's implicit max) — ample for this scale

    agg: dict[str, dict] = {}
    for row in (sess.data or []):
        fid = row["user_id"]
        a = agg.setdefault(fid, {"count": 0, "seconds": 0, "best": None, "last": None})
        a["count"] += 1
        a["seconds"] += row.get("total_seconds") or 0
        ai = row.get("ai_scores")
        score = None
        if isinstance(ai, list) and ai:
            score = ai[0].get("score")
        elif isinstance(ai, dict) and ai:
            score = ai.get("score")
        if score is not None:
            a["best"] = score if a["best"] is None else max(a["best"], score)
        fin = row.get("finished_at")
        if fin and (a["last"] is None or fin > a["last"]):
            a["last"] = fin

    items = []
    for fid in friend_ids:
        prof = prof_map.get(fid, {})
        bud = bud_map.get(fid, {})
        a = agg.get(fid)
        items.append({
            "friend_id": fid,
            "friend_name": prof.get("display_name"),
            "friend_avatar": prof.get("avatar_url"),
            "buddy_name": bud.get("buddy_name"),
            "buddy_type": bud.get("buddy_type"),
            "mood_level": bud.get("mood_level"),
            "sessions_count": a["count"] if a else 0,
            "total_seconds": a["seconds"] if a else 0,
            "best_score": a["best"] if a else None,
            "last_finished_at": a["last"] if a else None,
            "active": bool(a and a["count"] > 0),
        })

    # Active first (most sessions, then most recent), idle after.
    items.sort(
        key=lambda i: (i["active"], i["sessions_count"], i["last_finished_at"] or ""),
        reverse=True,
    )

    active_count = sum(1 for i in items if i["active"])
    return {
        "since": since_dt,
        "generated_at": now,
        "active_count": active_count,
        "idle_count": len(items) - active_count,
        "items": items,
    }


@router.post("/request", response_model=FriendResponse)
async def send_friend_request(body: FriendRequest, user: dict = Depends(get_current_user)):
    """Send a friend request via invite code or email."""
    db = get_supabase()

    # Normalize inputs and require at least one NON-EMPTY string.
    invite_code = (body.invite_code or "").strip()
    email = (body.email or "").strip()
    user_id_in = (body.user_id or "").strip()

    if not invite_code and not email and not user_id_in:
        raise HTTPException(
            status_code=400,
            detail="Provide a non-empty invite_code, email, or user_id.",
        )

    # Early self-add guards before any DB lookup.
    if email and user.get("email") and email.lower() == user["email"].lower():
        raise HTTPException(status_code=400, detail="Cannot friend yourself.")
    if user_id_in and user_id_in == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot friend yourself.")

    # Find the target user. Precedence: invite_code > email > user_id (global ranks).
    if invite_code:
        target = db.table("profiles").select("id, invite_code").eq("invite_code", invite_code).execute()
    elif email:
        target = db.table("profiles").select("id, invite_code").eq("email", email).execute()
    else:
        uid = valid_uuid(user_id_in, not_found_detail="User not found.")
        target = db.table("profiles").select("id, invite_code").eq("id", uid).execute()

    if not target.data:
        raise HTTPException(status_code=404, detail="User not found.")

    friend_id = target.data[0]["id"]

    # Self-add guard by resolved id (covers the invite_code path).
    if friend_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot friend yourself.")

    # Check if a friendship already exists in EITHER direction.
    existing = db.table("friendships") \
        .select("id, status, user_id, friend_id") \
        .or_(
            f"and(user_id.eq.{user['id']},friend_id.eq.{friend_id}),"
            f"and(user_id.eq.{friend_id},friend_id.eq.{user['id']})"
        ) \
        .execute()

    if existing.data:
        # Handle gracefully — never create a duplicate. Return the existing row
        # for pending/accepted so the client can treat it as idempotent; block
        # only on a 'blocked' relationship.
        row = existing.data[0]
        status = row["status"]
        if status == "blocked":
            raise HTTPException(status_code=409, detail="This relationship is blocked.")
        # pending or accepted → already exists; surface the existing friendship.
        return row

    # Anti-spam: only NEW requests are throttled (the idempotent branch above
    # already returned). Check the per-target cooldown FIRST (more specific,
    # longer window) so re-spamming one person doesn't burn the global budget,
    # then the short global rate limit against rapid-fire to many targets.
    if not await rate_limit_ok(f"freq:{user['id']}:{friend_id}", _FRIEND_REQ_PER_TARGET_COOLDOWN):
        raise HTTPException(
            status_code=429,
            detail="You've recently sent this person a request. Give them time to respond.",
        )
    if not await rate_limit_ok(f"freq:any:{user['id']}", _FRIEND_REQ_GLOBAL_COOLDOWN):
        raise HTTPException(
            status_code=429,
            detail="You're sending friend requests too quickly. Slow down a moment.",
        )

    try:
        result = db.table("friendships").insert({
            "user_id": user["id"],
            "friend_id": friend_id,
            "status": "pending"
        }).execute()
    except Exception:
        # The check-then-insert above isn't atomic; a concurrent request can
        # win the UNIQUE(user_id, friend_id) race. Treat that as idempotent:
        # re-fetch and return the now-existing row instead of a 500.
        existing = db.table("friendships") \
            .select("id, status, user_id, friend_id, created_at") \
            .or_(
                f"and(user_id.eq.{user['id']},friend_id.eq.{friend_id}),"
                f"and(user_id.eq.{friend_id},friend_id.eq.{user['id']})"
            ) \
            .execute()
        if existing.data:
            return existing.data[0]
        raise HTTPException(status_code=500, detail="Could not create friend request.")

    if not result.data:
        raise HTTPException(status_code=500, detail="Could not create friend request.")

    # Notify the target user (fire-and-forget)
    asyncio.create_task(
        notify_friend_request(friend_id, user.get("name", "Someone"))
    )

    # The global board shows per-viewer friend_status — bust its cache so the
    # new "pending" state shows immediately (cache is per-user, not reachable
    # from the client's TanStack invalidation).
    await cache_delete("lbglobal:*")

    return result.data[0]


@router.put("/{friendship_id}", response_model=FriendResponse)
async def respond_to_request(
    friendship_id: str,
    body: FriendAction,
    user: dict = Depends(get_current_user)
):
    """Accept, reject, or block a friend request."""
    friendship_id = valid_uuid(friendship_id, not_found_detail="Pending request not found.")
    db = get_supabase()

    # Only the recipient can accept/reject
    friendship = db.table("friendships") \
        .select("*") \
        .eq("id", friendship_id) \
        .eq("friend_id", user["id"]) \
        .eq("status", "pending") \
        .execute()

    if not friendship.data:
        raise HTTPException(status_code=404, detail="Pending request not found.")

    if body.action == "reject":
        # Delete the friendship entirely. Echo the row back with a "rejected"
        # status so the client sees the resolved state (the row no longer exists).
        db.table("friendships").delete().eq("id", friendship_id).execute()
        await cache_delete("lbglobal:*")
        rejected = dict(friendship.data[0])
        rejected["status"] = "rejected"
        return rejected

    # Map the action VERB to the DB status VALUE. The friendships.status CHECK
    # constraint allows only 'pending' / 'accepted' / 'blocked' — writing the raw
    # verb "accept" violates the constraint (this was the 500 on Accept).
    new_status = "accepted" if body.action == "accept" else "blocked"
    result = db.table("friendships") \
        .update({"status": new_status}) \
        .eq("id", friendship_id) \
        .execute()

    if not result.data:
        # Lost a race (row deleted/changed between check and update).
        raise HTTPException(status_code=404, detail="Pending request not found.")

    await cache_delete("lbglobal:*")
    return result.data[0]


@router.delete("/{friendship_id}")
async def remove_friend(friendship_id: str, user: dict = Depends(get_current_user)):
    """Remove a friend."""
    friendship_id = valid_uuid(friendship_id, not_found_detail="Friendship not found.")
    db = get_supabase()

    result = db.table("friendships") \
        .delete() \
        .eq("id", friendship_id) \
        .or_(f"user_id.eq.{user['id']},friend_id.eq.{user['id']}") \
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Friendship not found.")

    await cache_delete("lbglobal:*")
    return {"message": "Friend removed."}
