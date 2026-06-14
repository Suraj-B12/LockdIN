"""Secured cron endpoints.

Free-tier hosts (e.g. Render free) sleep after idle, so the in-process
APScheduler can't be relied on to fire the periodic jobs. Instead, an EXTERNAL
scheduler (GitHub Actions, cron-job.org, Supabase pg_cron) hits these endpoints
on a schedule. Every call must carry the shared CRON_SECRET (query param
`?token=` or header `X-Cron-Secret`); without it the endpoint returns 403.

Pair with SCHEDULER_ENABLED=false in production so jobs don't double-fire.
"""

import hmac

from fastapi import APIRouter, HTTPException, Query, Header
from config import get_settings
from services.scheduler import (
    check_inactive_users,
    check_buddy_mood_alerts,
    check_streak_warnings,
)

router = APIRouter(prefix="/api/cron", tags=["Cron"])


def _verify(token: str | None, header_token: str | None) -> None:
    """Reject the request unless a configured secret matches token or header.

    Fails closed when no secret is configured (so cron endpoints are never open
    by accident), and uses a constant-time comparison to avoid leaking the
    secret via response timing.
    """
    secret = get_settings().cron_secret
    supplied = token or header_token
    if not secret or not supplied or not hmac.compare_digest(str(supplied), str(secret)):
        raise HTTPException(status_code=403, detail="Forbidden.")


@router.post("/inactivity")
async def run_inactivity(
    token: str | None = Query(default=None),
    x_cron_secret: str | None = Header(default=None),
):
    """Send inactivity reminders to users idle for 2+ days."""
    _verify(token, x_cron_secret)
    await check_inactive_users()
    return {"ok": True, "job": "inactivity"}


@router.post("/streak-warning")
async def run_streak_warning(
    token: str | None = Query(default=None),
    x_cron_secret: str | None = Header(default=None),
):
    """Nudge users with a 3+ day streak who haven't logged a session today."""
    _verify(token, x_cron_secret)
    await check_streak_warnings()
    return {"ok": True, "job": "streak-warning"}


@router.post("/mood")
async def run_mood(
    token: str | None = Query(default=None),
    x_cron_secret: str | None = Header(default=None),
):
    """Alert users whose buddy mood dropped to devastated."""
    _verify(token, x_cron_secret)
    await check_buddy_mood_alerts()
    return {"ok": True, "job": "mood"}


@router.post("/all")
async def run_all(
    token: str | None = Query(default=None),
    x_cron_secret: str | None = Header(default=None),
):
    """Run every periodic job in sequence (the once-a-day catch-all)."""
    _verify(token, x_cron_secret)
    await check_inactive_users()
    await check_streak_warnings()
    await check_buddy_mood_alerts()
    return {"ok": True, "jobs": ["inactivity", "streak-warning", "mood"]}
