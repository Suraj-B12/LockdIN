"""Streak calculation and buddy mood logic."""

import logging
from datetime import date, timedelta
from services.supabase_client import get_supabase

log = logging.getLogger(__name__)


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


# ---- Streak freeze (humane streak: a missed day doesn't zero a run) ----

MAX_FREEZES = 2            # cap on how many freezes a user can bank
_MAX_BRIDGE_DAYS = 2       # a freeze run can cover at most this many missed days
_MILESTONES = (7, 30, 100, 365)


def _crossed_milestone(prior: int, current: int) -> bool:
    """True if `current` passed a milestone that `prior` had not yet reached."""
    return any(prior < m <= current for m in _MILESTONES)


def _maybe_bridge_with_freezes(user_id: str, buddy_row: dict | None) -> int:
    """If the streak just broke by a SMALL gap and the user has freeze(s), spend
    them to bridge the missed day(s) — insert 'frozen' day rows so the streak
    survives — and decrement the balance. Returns the number of freezes spent.

    No-op (returns 0) unless the `streak_freezes` column exists (migration 006)
    and there are freezes to spend, so it's safe to ship before the migration.
    Best-effort: any failure is swallowed (a heal/finish must never break).
    """
    if not buddy_row or "streak_freezes" not in buddy_row:
        return 0
    freezes = buddy_row.get("streak_freezes") or 0
    if freezes <= 0:
        return 0

    db = get_supabase()
    try:
        res = db.table("streaks") \
            .select("streak_date") \
            .eq("user_id", user_id) \
            .eq("completed", True) \
            .order("streak_date", desc=True) \
            .limit(1) \
            .execute()
        if not res.data:
            return 0

        last = date.fromisoformat(res.data[0]["streak_date"])
        today = date.today()
        missed = (today - last).days - 1  # days strictly between last and today
        # Alive already (today/yesterday), or gap too long to fully save.
        if missed < 1 or missed > min(freezes, _MAX_BRIDGE_DAYS):
            return 0

        spent = 0
        for i in range(1, missed + 1):
            d = (last + timedelta(days=i)).isoformat()
            try:
                db.table("streaks").insert({
                    "user_id": user_id,
                    "streak_date": d,
                    "daily_seconds": 0,
                    "daily_score": 0,
                    "completed": True,
                    "frozen": True,
                }).execute()
                spent += 1
            except Exception:
                # Row already exists (concurrent bridge / not actually missed) — skip.
                pass

        if spent > 0:
            new_freezes = max(0, freezes - spent)
            db.table("buddies").update({"streak_freezes": new_freezes}) \
                .eq("user_id", user_id).execute()
            buddy_row["streak_freezes"] = new_freezes
        return spent
    except Exception:
        log.warning("streak-freeze bridge failed for user %s", user_id, exc_info=True)
        return 0


def _days_since(last_session_date) -> int | None:
    """Whole days from `last_session_date` (date or ISO str) to today, or None."""
    if not last_session_date:
        return None
    try:
        last = (
            date.fromisoformat(last_session_date)
            if isinstance(last_session_date, str)
            else last_session_date
        )
        return (date.today() - last).days
    except Exception:
        return None


def _mood_for_streak(current_streak: int, last_session_date=None) -> int:
    """Buddy mood from the streak, with a GENTLE FLOOR for a freshly-broken
    streak: a single missed day shouldn't snap the buddy to "Devastated" (mood
    1). Mood 1 is reserved for prolonged inactivity. Active streaks (>=1) use the
    canonical mapping unchanged — and the session-finish path always has a
    streak >= 1, so this softening only ever affects the broken-streak heal."""
    if current_streak > 0:
        return get_mood_level(current_streak)
    days = _days_since(last_session_date)
    if days is None or days >= 5:
        return 1  # Devastated — gone for a while (or never played)
    if days >= 3:
        return 2  # Sad
    return 3      # Down — just broke their run


def refresh_streak_for_user(
    user_id: str, buddy_row: dict | None = None, persist: bool = True
) -> dict | None:
    """Recompute the live streak from the `streaks` table and self-heal the
    cached counters on the user's `buddies` row.

    WHY THIS EXISTS: `current_streak` / `longest_streak` / `mood_level` are only
    written when a session FINISHES (see ``update_streak_and_buddy``). If the user
    misses a day, nothing recomputes — the cached `current_streak` goes stale and
    keeps showing the old value (e.g. "1") even though the streak is broken. This
    recomputes the streak at READ time and persists the corrected values whenever
    they drift, so a broken streak decays to 0 the moment it's viewed — without
    depending on the (sleep-prone, free-tier) cron.

    It does NOT touch `last_session_date` (no session occurred). `longest_streak`
    is treated as a monotonic "best ever" record and is never regressed.

    persist=True   self-heals the stored row (owner reads + cron).
    persist=False  computes the corrected values and returns them WITHOUT
                   writing — used for OTHER users' views so a viewer's read never
                   writes another user's row.

    Concurrency: the write is COMPARE-AND-SET on the `current_streak` we read, so
    a heal can never clobber a concurrent session-finish (which owns RAISING the
    streak). Best-effort: any failure is logged and the caller gets the stored
    row back, so a heal hiccup never breaks a read.

    Returns the up-to-date buddy dict, or None if the user has no buddy row.
    """
    db = get_supabase()

    try:
        if buddy_row is None:
            res = db.table("buddies").select("*").eq("user_id", user_id).execute()
            if not res.data:
                return None
            buddy_row = res.data[0]

        # On the OWNER's own read/cron (persist), spend a freeze to bridge a small
        # gap before measuring, so a missed day doesn't zero the run. Never on a
        # friend's view (persist=False) — we don't spend someone else's freezes.
        if persist:
            _maybe_bridge_with_freezes(user_id, buddy_row)

        streaks = calculate_streak(user_id)
        current = streaks["current_streak"]
        # Never regress the best-ever record: keep the larger of stored vs computed.
        longest = max(buddy_row.get("longest_streak") or 0, streaks["longest_streak"])
        mood = _mood_for_streak(current, buddy_row.get("last_session_date"))

        corrected = {
            "current_streak": current,
            "longest_streak": longest,
            "mood_level": mood,
        }

        drifted = any(buddy_row.get(k) != v for k, v in corrected.items())
        if not drifted:
            return buddy_row

        # Display-only path (another user's view): return fresh numbers, write nothing.
        if not persist:
            return {**buddy_row, **corrected}

        # Compare-and-set: only overwrite if the stored current_streak is still
        # what we based this correction on. If a concurrent session-finish raised
        # it meanwhile, the predicate won't match and we leave the fresher write
        # intact (TOCTOU-safe).
        query = db.table("buddies").update(corrected).eq("user_id", user_id)
        prev = buddy_row.get("current_streak")
        if prev is not None:
            query = query.eq("current_streak", prev)
        updated = query.execute()

        if updated.data:
            return updated.data[0]

        # CAS missed (a concurrent write won) or the update returned nothing. The
        # winning write is authoritative; return our best-known merged view.
        return {**buddy_row, **corrected}
    except Exception:
        # Healing is a best-effort enhancement, never a hard dependency of a read.
        log.warning("streak self-heal failed for user %s", user_id, exc_info=True)
        return buddy_row


def decay_stale_streaks() -> int:
    """Batch counterpart to ``refresh_streak_for_user`` for the daily cron.

    Recomputes (and persists) streaks for users whose live streak may have
    broken since their last session, so buddy moods + streak counters stay
    correct even when the user never opens the app — which is what makes the
    "buddy devastated" mood alert actually fire.

    Only considers buddies with a live counter (`current_streak > 0`) whose last
    session predates yesterday; today/yesterday activity is still within the
    one-day grace and can't be stale. Returns the number of buddies corrected.
    """
    db = get_supabase()
    yesterday = (date.today() - timedelta(days=1)).isoformat()

    try:
        # Select the full row so refresh_streak_for_user always returns a
        # complete buddy dict (it merges onto whatever columns we pass in).
        candidates = db.table("buddies") \
            .select("*") \
            .gt("current_streak", 0) \
            .lt("last_session_date", yesterday) \
            .execute()
    except Exception:
        log.warning("decay_stale_streaks candidate query failed", exc_info=True)
        return 0

    if not candidates.data:
        return 0

    corrected = 0
    for row in candidates.data:
        before = row.get("current_streak")
        # refresh_streak_for_user is itself best-effort, so one bad row can't
        # abort the batch.
        healed = refresh_streak_for_user(row["user_id"], buddy_row=row)
        if healed and healed.get("current_streak") != before:
            corrected += 1
    return corrected


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

    # Fetch the buddy first — we need the prior streak (for milestone detection)
    # and the freeze balance. Tolerate absence (shouldn't happen post-trigger).
    bud = db.table("buddies").select("*").eq("user_id", user_id).execute()
    buddy_row = bud.data[0] if bud.data else None
    prior_streak = (buddy_row or {}).get("current_streak") or 0

    # Returning after a 1–2 day gap? Spend a freeze to bridge it BEFORE recording
    # today, so the run stays continuous instead of resetting.
    if buddy_row:
        _maybe_bridge_with_freezes(user_id, buddy_row)

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
    update_payload = {
        "current_streak": streaks["current_streak"],
        "longest_streak": streaks["longest_streak"],
        "mood_level": mood,
        "last_session_date": today,
    }

    # Reward hitting a milestone with one extra freeze (capped). Only if the
    # column exists (migration 006) — otherwise this is silently skipped.
    if buddy_row and "streak_freezes" in buddy_row and _crossed_milestone(
        prior_streak, streaks["current_streak"]
    ):
        current_freezes = buddy_row.get("streak_freezes") or 0
        update_payload["streak_freezes"] = min(MAX_FREEZES, current_freezes + 1)

    db.table("buddies").update(update_payload).eq("user_id", user_id).execute()
