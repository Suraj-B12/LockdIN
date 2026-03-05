"""Streak calculation and buddy mood logic."""

from datetime import date, timedelta
from services.supabase_client import get_supabase


def calculate_streak(user_id: str) -> dict:
    """
    Calculate current and longest streak for a user.
    A streak is consecutive days with at least one completed session.
    
    Returns: {"current_streak": int, "longest_streak": int}
    """
    db = get_supabase()

    # Get all streak dates for the user, ordered descending
    result = db.table("streaks") \
        .select("streak_date, completed") \
        .eq("user_id", user_id) \
        .eq("completed", True) \
        .order("streak_date", desc=True) \
        .execute()

    if not result.data:
        return {"current_streak": 0, "longest_streak": 0}

    dates = [date.fromisoformat(row["streak_date"]) for row in result.data]
    today = date.today()

    # Calculate current streak (must include today or yesterday)
    current_streak = 0
    expected_date = today

    # Allow streak to be valid if last session was today or yesterday
    if dates[0] == today:
        expected_date = today
    elif dates[0] == today - timedelta(days=1):
        expected_date = today - timedelta(days=1)
    else:
        # Streak is broken
        current_streak = 0
        longest_streak = _calculate_longest(dates)
        return {"current_streak": 0, "longest_streak": longest_streak}

    for d in dates:
        if d == expected_date:
            current_streak += 1
            expected_date -= timedelta(days=1)
        else:
            break

    longest_streak = max(current_streak, _calculate_longest(dates))

    return {"current_streak": current_streak, "longest_streak": longest_streak}


def _calculate_longest(dates: list[date]) -> int:
    """Find the longest consecutive streak in a list of dates."""
    if not dates:
        return 0

    longest = 1
    current = 1

    for i in range(1, len(dates)):
        if dates[i - 1] - dates[i] == timedelta(days=1):
            current += 1
            longest = max(longest, current)
        else:
            current = 1

    return longest


def get_mood_level(current_streak: int) -> int:
    """
    Map streak length to buddy mood (1-10).
    
    0 days (broken)  → 1 (Devastated)
    1-2 days         → 2-3 (Sad)
    3-6 days         → 4-5 (Neutral)
    7-13 days        → 6-7 (Happy)
    14-29 days       → 8 (Excited)
    30-59 days       → 9 (Thrilled)
    60+ days         → 10 (Ecstatic)
    """
    if current_streak == 0:
        return 1
    elif current_streak <= 1:
        return 2
    elif current_streak <= 2:
        return 3
    elif current_streak <= 4:
        return 4
    elif current_streak <= 6:
        return 5
    elif current_streak <= 9:
        return 6
    elif current_streak <= 13:
        return 7
    elif current_streak <= 29:
        return 8
    elif current_streak <= 59:
        return 9
    else:
        return 10


def update_streak_and_buddy(user_id: str, session_seconds: int, session_score: int):
    """
    After a session completes:
    1. Update or create today's streak entry
    2. Recalculate current/longest streak
    3. Update buddy mood
    """
    db = get_supabase()
    today = date.today().isoformat()

    # Upsert today's streak entry
    existing = db.table("streaks") \
        .select("*") \
        .eq("user_id", user_id) \
        .eq("streak_date", today) \
        .execute()

    if existing.data:
        # Add to existing day
        row = existing.data[0]
        db.table("streaks").update({
            "daily_seconds": row["daily_seconds"] + session_seconds,
            "daily_score": max(row["daily_score"], session_score),
            "completed": True
        }).eq("id", row["id"]).execute()
    else:
        # New day entry
        db.table("streaks").insert({
            "user_id": user_id,
            "streak_date": today,
            "daily_seconds": session_seconds,
            "daily_score": session_score,
            "completed": True
        }).execute()

    # Recalculate streaks
    streaks = calculate_streak(user_id)

    # Update buddy
    mood = get_mood_level(streaks["current_streak"])
    db.table("buddies").update({
        "current_streak": streaks["current_streak"],
        "longest_streak": streaks["longest_streak"],
        "mood_level": mood,
        "last_session_date": today
    }).eq("user_id", user_id).execute()
