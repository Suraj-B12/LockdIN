"""
Background scheduler — runs periodic jobs inside the FastAPI process.
Uses APScheduler with an in-memory job store (suitable for dev / single instance).

Jobs:
  • check_inactive_users()    — daily at 08:00 UTC
  • check_buddy_mood_alerts() — every 6 hours
"""

import asyncio
import logging
from datetime import date, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from services.supabase_client import get_supabase
from services.streak_calculator import get_mood_level, decay_stale_streaks

log = logging.getLogger(__name__)

# Mood level → human-readable label (mirrors streak_calculator.get_mood_level mapping)
_MOOD_LABELS = {
    1: "Devastated",
    2: "Sad",
    3: "Down",
    4: "Neutral",
    5: "Okay",
    6: "Content",
    7: "Happy",
    8: "Excited",
    9: "Thrilled",
    10: "Ecstatic",
}

_MOOD_EMOJI = {
    1: "😢", 2: "😟", 3: "😔", 4: "😐", 5: "🙂",
    6: "😊", 7: "😄", 8: "😁", 9: "🤩", 10: "🥳",
}

# Keep track of which users we already sent a mood alert to (prevents spam)
_mood_alert_sent: set[str] = set()

scheduler = AsyncIOScheduler()


# ============================================================
#  Job 1: Inactivity Reminder — daily at 08:00 UTC
# ============================================================

async def check_inactive_users() -> None:
    """
    Find users whose last session was 2+ days ago.
    Send both a push notification and email reminder.
    """
    # Import here to avoid circular imports at module load
    from routers.notifications import send_notification
    from services.email_service import send_inactivity_reminder

    log.info("[scheduler] Running inactivity check...")
    db = get_supabase()
    cutoff_date = (date.today() - timedelta(days=2)).isoformat()

    # Find buddies whose last_session_date is older than the cutoff (or NULL)
    result = db.table("buddies") \
        .select("user_id, buddy_name, mood_level, current_streak, last_session_date") \
        .or_(
            f"last_session_date.lt.{cutoff_date},"
            "last_session_date.is.null"
        ) \
        .execute()

    if not result.data:
        log.info("[scheduler] No inactive users found.")
        return

    for row in result.data:
        user_id = row["user_id"]
        buddy_name = row["buddy_name"] or "Buddy"
        mood_level = row["mood_level"] or 1
        current_streak = row["current_streak"] or 0

        # Calculate days inactive
        if row["last_session_date"]:
            last = date.fromisoformat(row["last_session_date"])
            days_inactive = (date.today() - last).days
        else:
            days_inactive = 99  # Never had a session

        if days_inactive < 2:
            continue  # Race condition guard

        # Fetch user profile for display_name + email
        profile_res = db.table("profiles") \
            .select("display_name, email") \
            .eq("id", user_id) \
            .single() \
            .execute()

        if not profile_res.data:
            continue

        display_name = profile_res.data.get("display_name", "there")
        mood_label = _MOOD_LABELS.get(mood_level, "Sad")
        mood_emoji = _MOOD_EMOJI.get(mood_level, "😢")

        # Check notification preferences
        prefs = _get_prefs(db, user_id)
        if not prefs.get("inactivity_reminders", True):
            continue

        # Push notification
        if prefs.get("push_enabled", True):
            await send_notification(
                [user_id],
                title="⏰ Time to lock in!",
                message=f"It's been {days_inactive} day{'s' if days_inactive != 1 else ''} since your last session. "
                        f"{buddy_name} is feeling {mood_label}.",
                data={"type": "inactivity_reminder", "days_inactive": days_inactive},
            )

        # Email
        if prefs.get("email_enabled", True):
            await send_inactivity_reminder(
                user_id=user_id,
                display_name=display_name,
                days_inactive=days_inactive,
                buddy_name=buddy_name,
                buddy_mood_label=mood_label,
                buddy_emoji=mood_emoji,
                current_streak=current_streak,
            )

        log.info(f"[scheduler] Inactivity reminder sent to user {user_id} ({days_inactive}d inactive).")


# ============================================================
#  Job 2: Buddy Mood Alert — every 6 hours
# ============================================================

async def check_buddy_mood_alerts() -> None:
    """
    Find users whose buddy mood just dropped to 1 (Devastated).
    Send a targeted email alert to help them bounce back.
    """
    from routers.notifications import send_notification
    from services.email_service import send_buddy_mood_alert_email

    log.info("[scheduler] Running buddy mood alert check...")
    db = get_supabase()

    # First decay any streaks that broke since the user's last session, so the
    # mood_level==1 query below sees freshly-devastated buddies. Without this,
    # mood only ever updates on session finish — and a user who simply STOPS
    # would never trip the alert. Cheap: only touches buddies that can be stale.
    corrected = decay_stale_streaks()
    if corrected:
        log.info(f"[scheduler] Decayed {corrected} stale streak(s) before mood check.")

    result = db.table("buddies") \
        .select("user_id, buddy_name, mood_level, longest_streak, last_session_date") \
        .eq("mood_level", 1) \
        .execute()

    if not result.data:
        return

    for row in result.data:
        user_id = row["user_id"]

        # Only send once until mood recovers (reset in session finish handler)
        if user_id in _mood_alert_sent:
            continue

        buddy_name = row["buddy_name"] or "Buddy"
        longest_streak = row["longest_streak"] or 0

        # Calculate days since last session
        days_since = 0
        if row["last_session_date"]:
            last = date.fromisoformat(row["last_session_date"])
            days_since = (date.today() - last).days

        # Fetch profile
        profile_res = db.table("profiles") \
            .select("display_name") \
            .eq("id", user_id) \
            .single() \
            .execute()

        if not profile_res.data:
            continue

        display_name = profile_res.data.get("display_name", "there")

        # Check notification preferences
        prefs = _get_prefs(db, user_id)
        if not prefs.get("buddy_mood_alerts", True):
            continue

        # Push
        if prefs.get("push_enabled", True):
            await send_notification(
                [user_id],
                title=f"😢 {buddy_name} is devastated",
                message=f"Your streak broke and {buddy_name} is feeling devastated. Start a session to cheer them up!",
                data={"type": "buddy_mood_alert", "mood_level": 1},
            )

        # Email
        if prefs.get("email_enabled", True):
            await send_buddy_mood_alert_email(
                user_id=user_id,
                display_name=display_name,
                buddy_name=buddy_name,
                mood_level=1,
                previous_mood_label="Happy",  # Generic fallback; we don't track previous mood
                longest_streak=longest_streak,
                days_since_session=days_since,
            )

        _mood_alert_sent.add(user_id)
        log.info(f"[scheduler] Buddy mood alert sent to user {user_id}.")


# ============================================================
#  Job 3: Streak Warning — daily at 18:00 UTC
# ============================================================

async def check_streak_warnings() -> None:
    """
    Find users with a 3+ day streak who haven't logged a session TODAY yet.
    Send a push notification nudge.
    """
    from routers.notifications import notify_streak_warning

    log.info("[scheduler] Running streak warning check...")
    db = get_supabase()
    today = date.today().isoformat()

    # Find users whose last_session_date is YESTERDAY and current_streak >= 3
    # and they don't have a streak entry for today yet
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    
    result = db.table("buddies") \
        .select("user_id, current_streak, last_session_date") \
        .eq("last_session_date", yesterday) \
        .gte("current_streak", 3) \
        .execute()

    if not result.data:
        return

    for row in result.data:
        user_id = row["user_id"]
        streak = row["current_streak"]

        # Check if they already have a session today (via streaks table)
        today_streak = db.table("streaks") \
            .select("id") \
            .eq("user_id", user_id) \
            .eq("streak_date", today) \
            .execute()
        
        if today_streak.data:
            continue

        # Check notification preferences
        prefs = _get_prefs(db, user_id)
        if not prefs.get("push_enabled", True):
            continue

        await notify_streak_warning(user_id, streak)
        log.info(f"[scheduler] Streak warning sent to user {user_id} ({streak}d streak).")


# ============================================================
#  Helper
# ============================================================

def _get_prefs(db, user_id: str) -> dict:
    """Fetch notification preferences for a user, returning defaults if not set."""
    res = db.table("notification_preferences") \
        .select("*") \
        .eq("user_id", user_id) \
        .execute()
    if res.data:
        return res.data[0]
    # Default to all enabled
    return {
        "push_enabled": True,
        "email_enabled": True,
        "friend_session_alerts": True,
        "inactivity_reminders": True,
        "buddy_mood_alerts": True,
        "nudge_enabled": True,
    }


def clear_mood_alert_cache(user_id: str) -> None:
    """
    Called after a user completes a session — allows mood alert to fire again
    if their streak breaks in the future.
    """
    _mood_alert_sent.discard(user_id)


# ============================================================
#  Scheduler lifecycle
# ============================================================

def start_scheduler() -> None:
    """Register all jobs and start the scheduler. Called on FastAPI startup."""
    # Inactivity check: daily at 08:00 UTC
    scheduler.add_job(
        check_inactive_users,
        trigger=CronTrigger(hour=8, minute=0, timezone="UTC"),
        id="inactivity_check",
        replace_existing=True,
        misfire_grace_time=3600,  # run even if missed by up to 1 hour
    )

    # Buddy mood alert: every 6 hours
    scheduler.add_job(
        check_buddy_mood_alerts,
        trigger=IntervalTrigger(hours=6),
        id="buddy_mood_alert",
        replace_existing=True,
        misfire_grace_time=600,
    )

    # Streak warning: daily at 18:00 UTC (evening nudge)
    scheduler.add_job(
        check_streak_warnings,
        trigger=CronTrigger(hour=18, minute=0, timezone="UTC"),
        id="streak_warning",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    scheduler.start()
    log.info("[scheduler] Started — inactivity check @ 08:00 UTC daily, mood alert every 6h.")


def stop_scheduler() -> None:
    """Graceful shutdown. Called on FastAPI shutdown."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        log.info("[scheduler] Stopped.")
