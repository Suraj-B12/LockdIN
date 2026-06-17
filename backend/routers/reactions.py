"""Reactions — give-only positive emoji on friends' finished sessions.

A tap toggles one (actor, session, emoji) row idempotently. No downvotes, no
read-receipts (validation, never anxiety). You may react to your own or an
ACCEPTED friend's session. Delivery rides the existing batched recap — there is
NO per-reaction push (avoids a notification treadmill).

Assumes migration_008 (reactions). Both endpoints fail safe (empty state) if the
table doesn't exist yet, so the session feed renders normally pre-migration and a
toggle never 500s during the deploy→migrate window.
"""

from fastapi import APIRouter, Depends, HTTPException
from middleware.auth import get_current_user, valid_uuid
from services.supabase_client import get_supabase
from services.cache import rate_limit_ok
from routers.notifications import _get_friend_ids
from models.schemas import ReactionToggle, ReactionState, ReactionBatchRequest

router = APIRouter(prefix="/api/reactions", tags=["Reactions"])


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


@router.post("/{session_id}", response_model=ReactionState)
async def toggle_reaction(
    session_id: str, body: ReactionToggle, user: dict = Depends(get_current_user)
):
    """Toggle one emoji on a session (yours or an accepted friend's)."""
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

    # Find the caller's existing reaction (fails safe if the table isn't migrated
    # yet — same graceful degradation as the batch endpoint).
    try:
        existing = db.table("reactions") \
            .select("id") \
            .eq("actor_id", user["id"]) \
            .eq("target_session_id", sid) \
            .eq("emoji", body.emoji) \
            .execute()
    except Exception:
        return {"counts": {}, "mine": []}  # table not migrated yet

    if existing.data:
        # Un-react ALWAYS proceeds — undo is never spammy, so we don't rate-limit
        # it. (Rate-limiting the delete made a quick tap→untap silently stick.)
        db.table("reactions").delete().eq("id", existing.data[0]["id"]).execute()
    else:
        # Light anti-spam on the only direction that can spam: re-adding.
        if not await rate_limit_ok(f"react:{user['id']}:{sid}:{body.emoji}", 1):
            return _state_for(db, sid, user["id"])
        try:
            db.table("reactions").insert({
                "actor_id": user["id"],
                "target_session_id": sid,
                "emoji": body.emoji,
            }).execute()
        except Exception:
            pass  # concurrent identical insert lost the UNIQUE race — idempotent

    return _state_for(db, sid, user["id"])
