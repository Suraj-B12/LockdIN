"""Session endpoints — start, pause, resume, finish focus sessions."""

from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from middleware.auth import get_current_user
from services.supabase_client import get_supabase
from services.ai_scorer import score_session
from services.streak_calculator import update_streak_and_buddy
from services.cache import cache_delete
from models.schemas import SessionResponse, SessionWorkLog

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])


@router.post("/start", response_model=SessionResponse)
async def start_session(user: dict = Depends(get_current_user)):
    """Start a new focus session. Only one active session allowed at a time."""
    db = get_supabase()

    # Check for existing active/paused session
    existing = db.table("sessions") \
        .select("*") \
        .eq("user_id", user["id"]) \
        .in_("status", ["active", "paused"]) \
        .execute()

    if existing.data:
        raise HTTPException(
            status_code=409,
            detail="You already have an active session. Finish it before starting a new one."
        )

    # Create new session
    result = db.table("sessions").insert({
        "user_id": user["id"],
        "status": "active"
    }).execute()

    return result.data[0]


@router.put("/{session_id}/pause", response_model=SessionResponse)
async def pause_session(session_id: str, user: dict = Depends(get_current_user)):
    """Pause an active session."""
    db = get_supabase()

    session = _get_user_session(db, session_id, user["id"])

    if session["status"] != "active":
        raise HTTPException(status_code=400, detail="Can only pause an active session.")

    # Calculate elapsed time since start (or last resume)
    started = datetime.fromisoformat(session["started_at"])
    now = datetime.now(timezone.utc)

    # Add elapsed seconds to total
    if session["paused_at"]:
        # Was resumed — calculate from when it was resumed
        elapsed = 0  # Already counted
    else:
        elapsed = int((now - started).total_seconds()) - session["total_seconds"]

    result = db.table("sessions").update({
        "status": "paused",
        "paused_at": now.isoformat(),
        "total_seconds": session["total_seconds"] + max(0, elapsed),
        "pause_count": session["pause_count"] + 1
    }).eq("id", session_id).execute()

    return result.data[0]


@router.put("/{session_id}/resume", response_model=SessionResponse)
async def resume_session(session_id: str, user: dict = Depends(get_current_user)):
    """Resume a paused session."""
    db = get_supabase()

    session = _get_user_session(db, session_id, user["id"])

    if session["status"] != "paused":
        raise HTTPException(status_code=400, detail="Can only resume a paused session.")

    # Update started_at to now so elapsed calculation works on next pause/finish
    result = db.table("sessions").update({
        "status": "active",
        "paused_at": None,
        "started_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", session_id).execute()

    return result.data[0]


@router.put("/{session_id}/finish", response_model=SessionResponse)
async def finish_session(
    session_id: str,
    body: SessionWorkLog,
    user: dict = Depends(get_current_user)
):
    """Finish a session, save work log, and trigger AI scoring."""
    db = get_supabase()

    session = _get_user_session(db, session_id, user["id"])

    if session["status"] == "finished":
        raise HTTPException(status_code=400, detail="Session is already finished.")

    now = datetime.now(timezone.utc)

    # Calculate final elapsed seconds
    total = session["total_seconds"]
    if session["status"] == "active":
        started = datetime.fromisoformat(session["started_at"])
        elapsed = int((now - started).total_seconds()) - total
        total += max(0, elapsed)

    # Update session
    result = db.table("sessions").update({
        "status": "finished",
        "finished_at": now.isoformat(),
        "total_seconds": total,
        "work_log": body.work_log
    }).eq("id", session_id).execute()

    session_data = result.data[0]

    # AI scoring (async, non-blocking for the response)
    duration_minutes = total // 60
    ai_result = await score_session(duration_minutes, body.work_log)

    # Save AI score
    db.table("ai_scores").insert({
        "session_id": session_id,
        "score": ai_result["score"],
        "summary": ai_result["summary"],
        "model_used": ai_result["model_used"]
    }).execute()

    # Update streaks and buddy mood
    update_streak_and_buddy(user["id"], total, ai_result["score"])

    # Invalidate caches
    await cache_delete(f"lb:*")
    await cache_delete(f"streak:{user['id']}")

    # Return session with score
    session_data["ai_score"] = ai_result["score"]
    session_data["ai_summary"] = ai_result["summary"]
    return session_data


@router.get("/active", response_model=SessionResponse | None)
async def get_active_session(user: dict = Depends(get_current_user)):
    """Get the user's current active or paused session (if any)."""
    db = get_supabase()

    result = db.table("sessions") \
        .select("*") \
        .eq("user_id", user["id"]) \
        .in_("status", ["active", "paused"]) \
        .limit(1) \
        .execute()

    if not result.data:
        return None
    return result.data[0]


@router.get("/history", response_model=list[SessionResponse])
async def get_session_history(
    limit: int = 20,
    offset: int = 0,
    user: dict = Depends(get_current_user)
):
    """Get past finished sessions with AI scores."""
    db = get_supabase()

    result = db.table("sessions") \
        .select("*, ai_scores(score, summary)") \
        .eq("user_id", user["id"]) \
        .eq("status", "finished") \
        .order("finished_at", desc=True) \
        .range(offset, offset + limit - 1) \
        .execute()

    # Flatten AI score into session response
    sessions = []
    for row in result.data:
        ai = row.pop("ai_scores", None)
        if ai and isinstance(ai, list) and len(ai) > 0:
            row["ai_score"] = ai[0]["score"]
            row["ai_summary"] = ai[0]["summary"]
        elif ai and isinstance(ai, dict):
            row["ai_score"] = ai["score"]
            row["ai_summary"] = ai["summary"]
        sessions.append(row)

    return sessions


def _get_user_session(db, session_id: str, user_id: str) -> dict:
    """Helper: get a session and verify ownership."""
    result = db.table("sessions") \
        .select("*") \
        .eq("id", session_id) \
        .eq("user_id", user_id) \
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found.")
    return result.data[0]
