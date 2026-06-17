"""Session endpoints — start, pause, resume, finish focus sessions."""

import asyncio
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from datetime import datetime, timezone
from middleware.auth import get_current_user, valid_uuid
from services.supabase_client import get_supabase
from services.ai_scorer import score_session
from services.streak_calculator import update_streak_and_buddy
from services.cache import cache_delete
from services.scheduler import clear_mood_alert_cache
from models.schemas import SessionResponse, SessionWorkLog
from routers.notifications import (
    notify_friends_session_started,
    notify_friends_session_finished,
)

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

    if not result.data:
        raise HTTPException(status_code=500, detail="Could not start session.")

    session_data = result.data[0]

    # Notify friends (fire-and-forget — never block session creation)
    asyncio.create_task(
        notify_friends_session_started(user["id"], user.get("name", "Someone"))
    )

    return session_data


@router.put("/{session_id}/pause", response_model=SessionResponse)
async def pause_session(session_id: str, user: dict = Depends(get_current_user)):
    """Pause an active session."""
    db = get_supabase()

    session = _get_user_session(db, session_id, user["id"])

    if session["status"] != "active":
        raise HTTPException(status_code=400, detail="Can only pause an active session.")

    now = datetime.now(timezone.utc)

    # Elapsed-time math (see _elapsed_for_active_segment for the full rationale):
    # `started_at` always marks the start of the CURRENT active segment (it is
    # reset to "now" on every resume), so the segment's duration is simply
    # now - started_at. We add that to the running total. Do NOT subtract
    # total_seconds here — that was the old bug that under-counted time after
    # the first resume.
    segment_seconds = _elapsed_for_active_segment(session, now)

    result = db.table("sessions").update({
        "status": "paused",
        "paused_at": now.isoformat(),
        "total_seconds": session["total_seconds"] + segment_seconds,
        "pause_count": session["pause_count"] + 1
    }).eq("id", session_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found.")

    return result.data[0]


@router.put("/{session_id}/resume", response_model=SessionResponse)
async def resume_session(session_id: str, user: dict = Depends(get_current_user)):
    """Resume a paused session."""
    db = get_supabase()

    session = _get_user_session(db, session_id, user["id"])

    if session["status"] != "paused":
        raise HTTPException(status_code=400, detail="Can only resume a paused session.")

    # Reset started_at to now so it marks the start of the new active segment.
    # The already-accumulated time lives in total_seconds and is preserved.
    result = db.table("sessions").update({
        "status": "active",
        "paused_at": None,
        "started_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", session_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found.")

    return result.data[0]


@router.put("/{session_id}/finish", response_model=SessionResponse)
async def finish_session(
    session_id: str,
    body: SessionWorkLog,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    """Finish a session, save the work log, and score it.

    AI scoring is NON-BLOCKING: we immediately write a provisional algorithm
    score (instant, no network) and update the streak/buddy so the
    leaderboard is never blocked or lost. A background task then asks
    OpenRouter for a better score and updates the row + daily_score when (if)
    it resolves. If the LLM fails, the provisional score stands.
    """
    db = get_supabase()

    session = _get_user_session(db, session_id, user["id"])

    if session["status"] == "finished":
        raise HTTPException(status_code=400, detail="Session is already finished.")

    now = datetime.now(timezone.utc)

    # Finalize total_seconds. If the session is currently active, add the
    # in-progress segment (now - started_at). If it's paused, total_seconds is
    # already complete (the segment was banked at pause time).
    total = session["total_seconds"]
    if session["status"] == "active":
        total += _elapsed_for_active_segment(session, now)

    # Mark the session finished. Re-assert status in the WHERE clause so two
    # concurrent finishes can't both proceed (only one flips active/paused →
    # finished); the loser gets no rows back and exits cleanly.
    result = db.table("sessions").update({
        "status": "finished",
        "finished_at": now.isoformat(),
        "total_seconds": total,
        "work_log": body.work_log
    }).eq("id", session_id).in_("status", ["active", "paused"]).execute()

    if not result.data:
        # Either the row vanished or another request finished it first.
        raise HTTPException(status_code=409, detail="Session already finished.")

    session_data = result.data[0]

    # --- Provisional score (synchronous, instant) ---------------------------
    # Use the deterministic algorithm so the streak/leaderboard update happens
    # right now and is never lost if the LLM is slow or down.
    from services.ai_scorer import _score_with_algorithm
    duration_minutes = total // 60
    provisional = _score_with_algorithm(duration_minutes, body.work_log)

    # Insert the provisional score. session_id is UNIQUE; if a row somehow
    # already exists, don't 500 — the conditional finish above already makes a
    # double-finish unreachable, so this is pure belt-and-suspenders.
    try:
        db.table("ai_scores").insert({
            "session_id": session_id,
            "score": provisional["score"],
            "summary": provisional["summary"],
            "model_used": "algorithm-provisional",
            "breakdown": provisional["breakdown"],
        }).execute()
    except Exception as e:
        print(f"[ai] provisional score insert skipped for session {session_id}: {e}")

    # Update streaks and buddy mood with the provisional score immediately.
    update_streak_and_buddy(user["id"], total, provisional["score"])

    # Invalidate caches so the new score shows up (friends + global boards).
    await cache_delete("lb:*")
    await cache_delete("lbglobal:*")
    await cache_delete(f"streak:{user['id']}")

    # Notify friends of completion (fire-and-forget).
    asyncio.create_task(
        notify_friends_session_finished(
            user["id"],
            user.get("name", "Someone"),
            total // 60,
            provisional["score"]
        )
    )

    # Clear mood alert cache so future streak breaks can trigger a fresh alert.
    clear_mood_alert_cache(user["id"])

    # --- Kick off the real LLM score in the background ----------------------
    # Never blocks the response; never raises out (see _upgrade_score_with_llm).
    background_tasks.add_task(
        _upgrade_score_with_llm,
        user_id=user["id"],
        session_id=session_id,
        duration_minutes=duration_minutes,
        work_log=body.work_log,
    )

    # Return the session fast, with the provisional score/summary.
    session_data["ai_score"] = provisional["score"]
    session_data["ai_summary"] = provisional["summary"]
    return session_data


async def _upgrade_score_with_llm(
    user_id: str,
    session_id: str,
    duration_minutes: int,
    work_log: str,
) -> None:
    """Background task: fetch the OpenRouter score and upgrade the stored row.

    If the LLM produced a real score (model_used is not an algorithm path),
    update ai_scores (score/summary/model_used/breakdown) and the corresponding
    streaks.daily_score for the session's day. On any failure we leave the
    provisional score in place. This function must NEVER raise — it runs
    detached from the request.
    """
    try:
        result = await score_session(duration_minutes, work_log)

        # Only upgrade if an actual LLM model answered. If score_session fell
        # back to the algorithm, the provisional row is already equivalent.
        model_used = result.get("model_used", "")
        if model_used.startswith("algorithm"):
            return

        db = get_supabase()

        # Update the AI score row with the LLM's verdict.
        db.table("ai_scores").update({
            "score": result["score"],
            "summary": result["summary"],
            "model_used": model_used,
            "breakdown": result.get("breakdown"),
        }).eq("session_id", session_id).execute()

        # Reconcile the streak's daily_score for the session's day. We mirror
        # update_streak_and_buddy's "best score of the day wins" rule.
        session_row = db.table("sessions") \
            .select("session_date") \
            .eq("id", session_id) \
            .execute()
        if session_row.data:
            session_date = session_row.data[0]["session_date"]
            streak_row = db.table("streaks") \
                .select("id, daily_score") \
                .eq("user_id", user_id) \
                .eq("streak_date", session_date) \
                .execute()
            if streak_row.data:
                row = streak_row.data[0]
                new_daily = max(row["daily_score"], result["score"])
                if new_daily != row["daily_score"]:
                    db.table("streaks").update({"daily_score": new_daily}) \
                        .eq("id", row["id"]).execute()

        # Invalidate leaderboard cache so the upgraded score is reflected.
        await cache_delete("lb:*")
    except Exception as e:
        # Swallow everything — provisional score remains valid.
        print(f"[ai] Background LLM scoring failed for session {session_id}: {e}")


@router.delete("/{session_id}")
async def cancel_session(session_id: str, user: dict = Depends(get_current_user)):
    """Discard an IN-PROGRESS (active or paused) session entirely — no score, no
    streak, no notification. For sessions started by accident. A finished session
    can't be cancelled (it's already part of your history)."""
    db = get_supabase()
    session = _get_user_session(db, session_id, user["id"])

    if session["status"] == "finished":
        raise HTTPException(status_code=400, detail="A finished session can't be cancelled.")

    # Re-assert the status in the WHERE clause so a concurrent finish can't race
    # us into deleting a now-finished (scored) session.
    result = db.table("sessions") \
        .delete() \
        .eq("id", session_id) \
        .eq("user_id", user["id"]) \
        .in_("status", ["active", "paused"]) \
        .execute()

    if not result.data:
        raise HTTPException(status_code=409, detail="Session is no longer cancellable.")

    return {"ok": True, "message": "Session discarded."}


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
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0, le=100_000),
    user: dict = Depends(get_current_user)
):
    """Get past finished sessions with AI scores.

    `limit`/`offset` are bounded (limit 1–200, offset 0–100k) so a client can't
    request an unbounded page and exhaust memory. The History page legitimately
    fetches 200 in one batch, so 200 is the ceiling (do not lower without
    updating web/src/pages/History.tsx).
    """
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


def _elapsed_for_active_segment(session: dict, now: datetime) -> int:
    """Seconds elapsed in the CURRENT active segment.

    `started_at` always marks the start of the current active segment because
    resume() resets it to "now". So the segment duration is simply
    now - started_at. Accumulated time from earlier segments lives in
    total_seconds and must NOT be subtracted here.

    Clamped to >= 0 to guard against clock skew between the DB default
    (NOW()) and the server clock.
    """
    started = datetime.fromisoformat(session["started_at"])
    return max(0, int((now - started).total_seconds()))


def _get_user_session(db, session_id: str, user_id: str) -> dict:
    """Helper: get a session and verify ownership.

    Validates the id as a UUID first so a malformed path param yields a clean
    404 rather than a Postgres invalid-uuid error (500).
    """
    session_id = valid_uuid(session_id, not_found_detail="Session not found.")
    result = db.table("sessions") \
        .select("*") \
        .eq("id", session_id) \
        .eq("user_id", user_id) \
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found.")
    return result.data[0]
