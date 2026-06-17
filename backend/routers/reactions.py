"""Reactions — give-only positive emoji on friends' finished sessions.

A tap toggles one (actor, session, emoji) row idempotently. No downvotes, no
read-receipts (validation, never anxiety). You may react to your own or an
ACCEPTED friend's session. Delivery rides the existing batched recap — there is
NO per-reaction push (avoids a notification treadmill).

Assumes migration_008 (reactions). The batch endpoint fails safe (returns {}) if
the table doesn't exist yet, so the session feed renders normally pre-migration.
"""

from fastapi import APIRouter, Depends, HTTPException
from middleware.auth import get_current_user, valid_uuid
from services.supabase_client import get_supabase
from services.cache import rate_limit_ok
from models.schemas import ReactionToggle, ReactionState, ReactionBatchRequest

router = APIRouter(prefix="/api/reactions", tags=["Reactions"])


def _state_for(db, session_id: str, actor_id: str) -> dict:
    """Aggregate counts per emoji for a session + which the actor has set."""
    rows = db.table("reactions") \
        .select("emoji, actor_id") \
        .eq("target_session_id", session_id) \
        .execute()
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

    sess = db.table("sessions").select("user_id").eq("id", sid).execute()
    if not sess.data:
        raise HTTPException(status_code=404, detail="Session not found.")
    owner = sess.data[0]["user_id"]

    if owner != user["id"]:
        friendship = db.table("friendships").select("id").eq("status", "accepted").or_(
            f"and(user_id.eq.{user['id']},friend_id.eq.{owner}),"
            f"and(user_id.eq.{owner},friend_id.eq.{user['id']})"
        ).execute()
        if not friendship.data:
            raise HTTPException(status_code=403, detail="You can only react to friends' sessions.")

    # Light anti-spam on rapid toggling of the same emoji on the same session.
    if not await rate_limit_ok(f"react:{user['id']}:{sid}:{body.emoji}", 1):
        return _state_for(db, sid, user["id"])

    existing = db.table("reactions") \
        .select("id") \
        .eq("actor_id", user["id"]) \
        .eq("target_session_id", sid) \
        .eq("emoji", body.emoji) \
        .execute()

    if existing.data:
        db.table("reactions").delete().eq("id", existing.data[0]["id"]).execute()
    else:
        try:
            db.table("reactions").insert({
                "actor_id": user["id"],
                "target_session_id": sid,
                "emoji": body.emoji,
            }).execute()
        except Exception:
            pass  # concurrent identical insert lost the UNIQUE race — idempotent

    return _state_for(db, sid, user["id"])
