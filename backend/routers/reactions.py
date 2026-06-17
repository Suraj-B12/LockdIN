"""Reactions — give-only positive emoji on friends' finished sessions.

SINGLE-select: a user holds at most ONE reaction per session. Tapping a different
emoji replaces it; tapping the active one removes it. No downvotes, no read-
receipts (validation, never anxiety). You may react to your own or an ACCEPTED
friend's session. The `received` endpoint surfaces reactions left on YOUR
sessions (delivered via the recap — no per-reaction push / notification treadmill).

Assumes migration_008 (table) + migration_009 (single-select uniqueness). Every
endpoint fails safe (empty result) if the table doesn't exist yet, so the rest of
the app renders normally pre-migration and nothing 500s during the deploy→migrate
window.
"""

from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from middleware.auth import get_current_user, valid_uuid
from services.supabase_client import get_supabase
from services.cache import rate_limit_ok
from routers.notifications import _get_friend_ids
from models.schemas import (
    ReactionToggle,
    ReactionState,
    ReactionBatchRequest,
    ReactionReceived,
)

router = APIRouter(prefix="/api/reactions", tags=["Reactions"])


def _clamp_since(since: str | None) -> datetime:
    """Parse a since= window: default 7 days, clamped to a 30-day floor."""
    now = datetime.now(timezone.utc)
    if not since:
        return now - timedelta(days=7)
    try:
        dt = datetime.fromisoformat(str(since).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return now - timedelta(days=7)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return max(dt, now - timedelta(days=30))


def _state_for(db, session_id: str, actor_id: str) -> dict:
    """Aggregate counts per emoji for a session + which the actor has set.
    Fails safe (empty state) if the reactions table isn't migrated yet."""
    try:
        rows = db.table("reactions") \
            .select("emoji, actor_id") \
            .eq("target_session_id", session_id) \
            .execute()
    except Exception:
        return {"counts": {}, "mine": []}
    counts: dict[str, int] = {}
    mine: list[str] = []
    for r in rows.data or []:
        e = r["emoji"]
        counts[e] = counts.get(e, 0) + 1
        if r["actor_id"] == actor_id:
            mine.append(e)
    return {"counts": counts, "mine": mine}


@router.post("/batch", response_model=dict[str, ReactionState])
async def batch_reactions(body: ReactionBatchRequest, user: dict = Depends(get_current_user)):
    """Reaction state for many sessions at once (one round-trip for a feed)."""
    ids = [str(x) for x in body.session_ids][:200]
    if not ids:
        return {}
    db = get_supabase()

    # Authorize the same way a single toggle does: only expose counts for
    # sessions the caller owns or shares with an accepted friend. (Service-role
    # bypasses RLS, so this in-code gate is the real check.)
    try:
        owners = db.table("sessions").select("id, user_id").in_("id", ids).execute()
    except Exception:
        return {}
    allowed_owners = set(await _get_friend_ids(user["id"])) | {user["id"]}
    ids = [o["id"] for o in (owners.data or []) if o["user_id"] in allowed_owners]
    if not ids:
        return {}

    try:
        rows = db.table("reactions") \
            .select("target_session_id, emoji, actor_id") \
            .in_("target_session_id", ids) \
            .execute()
    except Exception:
        return {}  # table not migrated yet → feed still renders, just no reactions

    out: dict[str, dict] = {sid: {"counts": {}, "mine": []} for sid in ids}
    for r in rows.data or []:
        st = out.setdefault(r["target_session_id"], {"counts": {}, "mine": []})
        e = r["emoji"]
        st["counts"][e] = st["counts"].get(e, 0) + 1
        if r["actor_id"] == user["id"]:
            st["mine"].append(e)
    return out


@router.get("/received", response_model=list[ReactionReceived])
async def reactions_received(since: str | None = None, user: dict = Depends(get_current_user)):
    """Reactions friends left on the CALLER's own sessions since `since` (default
    7d). Authorized by session ownership. Fails safe ([]) pre-migration."""
    db = get_supabase()
    since_dt = _clamp_since(since)

    # The caller's session ids (a reaction references a session; we only surface
    # reactions on sessions the caller OWNS). Bound to the 200 most-recent FINISHED
    # sessions: reactions only land on finished sessions, the `since` window keeps
    # them recent, and a larger IN(...) list would overflow the PostgREST URL
    # (same 200 cap the batch endpoint uses).
    try:
        mine = db.table("sessions").select("id") \
            .eq("user_id", user["id"]) \
            .eq("status", "finished") \
            .order("finished_at", desc=True) \
            .limit(200) \
            .execute()
    except Exception:
        return []
    my_ids = [s["id"] for s in (mine.data or [])]
    if not my_ids:
        return []

    try:
        rows = db.table("reactions") \
            .select("actor_id, emoji, target_session_id, created_at") \
            .in_("target_session_id", my_ids) \
            .neq("actor_id", user["id"]) \
            .gte("created_at", since_dt.isoformat()) \
            .order("created_at", desc=True) \
            .limit(50) \
            .execute()
    except Exception:
        return []  # table not migrated yet
    if not rows.data:
        return []

    actor_ids = list({r["actor_id"] for r in rows.data})
    try:
        profs = db.table("profiles").select("id, display_name, avatar_url").in_("id", actor_ids).execute()
        pmap = {p["id"]: p for p in (profs.data or [])}
    except Exception:
        pmap = {}  # degrade to generic names rather than 500 (fallbacks below cover it)

    return [
        {
            "actor_id": r["actor_id"],
            "actor_name": pmap.get(r["actor_id"], {}).get("display_name", "A friend"),
            "actor_avatar": pmap.get(r["actor_id"], {}).get("avatar_url"),
            "emoji": r["emoji"],
            "session_id": r["target_session_id"],
            "created_at": r["created_at"],
        }
        for r in rows.data
    ]


@router.post("/{session_id}", response_model=ReactionState)
async def toggle_reaction(
    session_id: str, body: ReactionToggle, user: dict = Depends(get_current_user)
):
    """Set/replace/clear your single reaction on a session (yours or a friend's)."""
    sid = valid_uuid(session_id, not_found_detail="Session not found.")
    db = get_supabase()

    sess = db.table("sessions").select("user_id, status").eq("id", sid).execute()
    if not sess.data:
        raise HTTPException(status_code=404, detail="Session not found.")
    owner = sess.data[0]["user_id"]

    # Reactions celebrate completed work — quietly ignore active/paused sessions
    # (idempotent no-op so a stray request can't dangle a reaction on one that's
    # later cancelled or reset).
    if sess.data[0].get("status") != "finished":
        return _state_for(db, sid, user["id"])

    if owner != user["id"]:
        friendship = db.table("friendships").select("id").eq("status", "accepted").or_(
            f"and(user_id.eq.{user['id']},friend_id.eq.{owner}),"
            f"and(user_id.eq.{owner},friend_id.eq.{user['id']})"
        ).execute()
        if not friendship.data:
            raise HTTPException(status_code=403, detail="You can only react to friends' sessions.")

    # Find the caller's existing reaction on this session (single-select → at most
    # one). Fails safe if the table isn't migrated yet, like the batch endpoint.
    try:
        existing = db.table("reactions") \
            .select("id, emoji") \
            .eq("actor_id", user["id"]) \
            .eq("target_session_id", sid) \
            .execute()
    except Exception:
        return {"counts": {}, "mine": []}  # table not migrated yet

    current = existing.data[0] if existing.data else None

    if current and current["emoji"] == body.emoji:
        # Tapped your active emoji → un-react. Always proceeds (undo is never spammy).
        db.table("reactions").delete().eq("id", current["id"]).execute()
    elif current:
        # Tapped a different emoji → REPLACE in place. Atomic update of the one
        # row, so you're never momentarily left with zero, and never rate-limited.
        db.table("reactions").update({"emoji": body.emoji}).eq("id", current["id"]).execute()
    else:
        # First reaction on this session — light anti-spam on the add only.
        if not await rate_limit_ok(f"react:{user['id']}:{sid}", 1):
            return _state_for(db, sid, user["id"])
        try:
            db.table("reactions").insert({
                "actor_id": user["id"],
                "target_session_id": sid,
                "emoji": body.emoji,
            }).execute()
        except Exception:
            pass  # lost the UNIQUE(actor,session) race — idempotent

    return _state_for(db, sid, user["id"])
