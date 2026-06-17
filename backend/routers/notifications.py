"""OneSignal notification endpoints and service — push + email triggers."""

import asyncio
from fastapi import APIRouter, Depends, HTTPException
import httpx
from middleware.auth import get_current_user, valid_uuid
from services.supabase_client import get_supabase
from services.cache import rate_limit_ok
from config import get_settings
from models.schemas import NotificationPrefsResponse, NotificationPrefsUpdate

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

# Anti-spam: a user can nudge the same friend at most once per this window.
_NUDGE_COOLDOWN_SECONDS = 60 * 60  # 1 hour


# ============================================================
#  Core push sender
# ============================================================

async def send_notification(
    user_ids: list[str],
    title: str,
    message: str,
    data: dict | None = None
):
    """Send a push notification to specific users via OneSignal."""
    settings = get_settings()

    payload = {
        "app_id": settings.onesignal_app_id,
        "include_aliases": {"external_id": user_ids},
        "target_channel": "push",
        "headings": {"en": title},
        "contents": {"en": message},
    }

    if data:
        payload["data"] = data

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.onesignal.com/notifications",
                json=payload,
                headers={
                    "Authorization": f"Key {settings.onesignal_api_key}",
                    "Content-Type": "application/json"
                }
            )
            return response.json()
    except Exception as e:
        # Notifications should never block the main flow
        print(f"[push] Notification error: {e}")
        return None


# ============================================================
#  Event-driven notification helpers
# ============================================================

async def notify_friends_session_started(user_id: str, user_name: str):
    """Push + email: notify all friends that this user started a session.

    Runs as a fire-and-forget task — must never raise (a failure here must not
    surface as an unretrieved-task error or affect the originating request).
    """
    try:
        friend_ids = await _get_friend_ids(user_id)
        if not friend_ids:
            return

        # Fire-and-forget push
        asyncio.create_task(send_notification(
            friend_ids,
            "🔥 Lock In Alert",
            f"{user_name} just locked in!",
            {"type": "session_started", "user_id": user_id}
        ))

        # Fire-and-forget email (only to friends who have friend_session_alerts on)
        db = get_supabase()
        enabled_ids = _filter_by_pref(db, friend_ids, "friend_session_alerts")
        if enabled_ids:
            from services.email_service import send_friend_session_alert_email
            asyncio.create_task(send_friend_session_alert_email(
                recipient_user_ids=enabled_ids,
                recipient_user_id_for_urls=enabled_ids[0],
                friend_name=user_name,
                user_name="You",  # Generic — email goes to multiple recipients
            ))
    except Exception as e:
        print(f"[push] notify_friends_session_started failed: {e}")


async def notify_friends_session_finished(user_id: str, user_name: str, duration_min: int, score: int):
    """Push: notify all friends that this user finished a session.

    Fire-and-forget — must never raise out into the originating request.
    """
    try:
        friend_ids = await _get_friend_ids(user_id)
        if not friend_ids:
            return

        hours = duration_min // 60
        mins = duration_min % 60
        time_str = f"{hours}h {mins}m" if hours > 0 else f"{mins}m"

        asyncio.create_task(send_notification(
            friend_ids,
            "✅ Session Complete",
            f"{user_name} finished {time_str} of focus. Score: {score}/100",
            {"type": "session_finished", "user_id": user_id, "score": score}
        ))
    except Exception as e:
        print(f"[push] notify_friends_session_finished failed: {e}")


async def notify_friend_request(target_user_id: str, from_user_name: str):
    """Push: new friend request received."""
    asyncio.create_task(send_notification(
        [target_user_id],
        "👋 New Friend Request",
        f"{from_user_name} wants to be your accountability partner.",
        {"type": "friend_request"}
    ))


async def notify_streak_warning(user_id: str, streak_days: int):
    """Push: user's streak is at risk (no session today, streak >= 3)."""
    asyncio.create_task(send_notification(
        [user_id],
        f"🔥 Your {streak_days}-day streak is glowing",
        "A quick session today keeps it going strong.",
        {"type": "streak_warning", "streak_days": streak_days}
    ))


# ============================================================
#  REST endpoints
# ============================================================

@router.post("/nudge/{friend_id}")
async def nudge_friend(friend_id: str, user: dict = Depends(get_current_user)):
    """Send a nudge push notification to a friend."""
    friend_id = valid_uuid(friend_id, not_found_detail="Friend not found.")
    db = get_supabase()

    # Verify friendship
    friendship = db.table("friendships").select("id").eq("status", "accepted") \
        .or_(
            f"and(user_id.eq.{user['id']},friend_id.eq.{friend_id}),"
            f"and(user_id.eq.{friend_id},friend_id.eq.{user['id']})"
        ).execute()

    if not friendship.data:
        raise HTTPException(status_code=403, detail="You must be friends to nudge.")

    # Check recipient's nudge preference
    prefs = _get_prefs(db, friend_id)
    if not prefs.get("nudge_enabled", True):
        raise HTTPException(status_code=403, detail="This user has disabled nudges.")

    # Anti-spam: throttle repeat nudges to the same friend (per-sender-per-target).
    if not await rate_limit_ok(f"nudge:{user['id']}:{friend_id}", _NUDGE_COOLDOWN_SECONDS):
        raise HTTPException(
            status_code=429,
            detail="You've already nudged this friend recently. Give them a little time.",
        )

    await send_notification(
        [friend_id],
        "👀 Nudge!",
        f"{user.get('name') or 'A friend'} is wondering where you are. Time to lock in!",
        {"type": "nudge", "from_user_id": user["id"]}
    )

    return {"message": "Nudge sent!"}


@router.get("/preferences", response_model=NotificationPrefsResponse)
async def get_preferences(user: dict = Depends(get_current_user)):
    """Get the current user's notification preferences.

    Self-heals if the auto-create trigger never ran (no row): insert defaults,
    tolerate a concurrent insert (UNIQUE user_id) race, and return the real
    persisted row (so the DB-generated unsubscribe_token is included).
    """
    db = get_supabase()
    result = db.table("notification_preferences") \
        .select("*") \
        .eq("user_id", user["id"]) \
        .execute()

    if result.data:
        return result.data[0]

    # No row yet — insert defaults.
    defaults = {
        "user_id": user["id"],
        "push_enabled": True,
        "email_enabled": True,
        "friend_session_alerts": True,
        "inactivity_reminders": True,
        "buddy_mood_alerts": True,
        "nudge_enabled": True,
    }
    try:
        inserted = db.table("notification_preferences").insert(defaults).execute()
        if inserted.data:
            return inserted.data[0]
    except Exception:
        pass  # Likely a concurrent insert won the race — fall through to re-select.

    # Re-fetch the persisted row (covers the race and yields the real token).
    refetch = db.table("notification_preferences") \
        .select("*") \
        .eq("user_id", user["id"]) \
        .execute()
    if refetch.data:
        return refetch.data[0]
    # Last resort: return the in-memory defaults (token omitted; Optional).
    return defaults


@router.put("/preferences", response_model=NotificationPrefsResponse)
async def update_preferences(
    body: NotificationPrefsUpdate,
    user: dict = Depends(get_current_user)
):
    """Update the current user's notification preferences."""
    db = get_supabase()
    update_data = body.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update.")

    result = db.table("notification_preferences") \
        .update(update_data) \
        .eq("user_id", user["id"]) \
        .execute()

    if result.data:
        return result.data[0]

    # Row doesn't exist yet — create with provided values on top of defaults.
    defaults = {
        "user_id": user["id"],
        "push_enabled": True,
        "email_enabled": True,
        "friend_session_alerts": True,
        "inactivity_reminders": True,
        "buddy_mood_alerts": True,
        "nudge_enabled": True,
        **update_data,
    }
    try:
        inserted = db.table("notification_preferences").insert(defaults).execute()
        if inserted.data:
            return inserted.data[0]
    except Exception:
        # Concurrent insert won the race; retry the update against the now-extant row.
        pass

    retry = db.table("notification_preferences") \
        .update(update_data) \
        .eq("user_id", user["id"]) \
        .execute()
    if retry.data:
        return retry.data[0]

    raise HTTPException(status_code=500, detail="Could not update preferences.")


@router.get("/unsubscribe/{user_id}")
async def unsubscribe_email(user_id: str, token: str = ""):
    """One-click email unsubscribe (disables all email notifications).

    SECURITY: this endpoint is public (linked from emails, no auth header), so
    it MUST be gated by the per-user unsubscribe_token. Without a matching
    token anyone could unsubscribe anyone. We look up the row by BOTH user_id
    and token; a missing row, missing token, or mismatch all yield 403.

    Both path and token are validated as UUIDs first so malformed input fails
    closed (403) instead of reaching the DB as a type error (which would 500).
    """
    from uuid import UUID

    if not token:
        raise HTTPException(status_code=403, detail="Missing unsubscribe token.")

    # user_id and unsubscribe_token are both UUID columns — reject non-UUIDs
    # up front (fail-closed) rather than letting Postgres raise.
    try:
        user_id = str(UUID(user_id))
        token = str(UUID(token))
    except (ValueError, AttributeError, TypeError):
        raise HTTPException(status_code=403, detail="Invalid unsubscribe token.")

    db = get_supabase()

    try:
        # Verify the token matches this user's stored token before doing anything.
        row = db.table("notification_preferences") \
            .select("id") \
            .eq("user_id", user_id) \
            .eq("unsubscribe_token", token) \
            .execute()

        if not row.data:
            # Either no prefs row, or the token doesn't match — refuse.
            raise HTTPException(status_code=403, detail="Invalid unsubscribe token.")

        db.table("notification_preferences") \
            .update({"email_enabled": False}) \
            .eq("user_id", user_id) \
            .eq("unsubscribe_token", token) \
            .execute()
    except HTTPException:
        raise
    except Exception as e:
        # Never leak DB internals to this public endpoint.
        print(f"[unsubscribe] error: {e}")
        raise HTTPException(status_code=500, detail="Could not process unsubscribe.")

    return {"message": "Email notifications disabled. You can re-enable them in your profile settings."}


# ============================================================
#  Private helpers
# ============================================================

async def _get_friend_ids(user_id: str) -> list[str]:
    """Get all accepted friend IDs for a user."""
    db = get_supabase()
    result = db.table("friendships").select("user_id, friend_id") \
        .eq("status", "accepted") \
        .or_(f"user_id.eq.{user_id},friend_id.eq.{user_id}") \
        .execute()

    friend_ids = []
    for row in result.data:
        if row["user_id"] == user_id:
            friend_ids.append(row["friend_id"])
        else:
            friend_ids.append(row["user_id"])
    return friend_ids


def _get_prefs(db, user_id: str) -> dict:
    """Fetch notification preferences, returning all-enabled defaults if not set."""
    res = db.table("notification_preferences") \
        .select("*") \
        .eq("user_id", user_id) \
        .execute()
    if res.data:
        return res.data[0]
    return {
        "push_enabled": True,
        "email_enabled": True,
        "friend_session_alerts": True,
        "inactivity_reminders": True,
        "buddy_mood_alerts": True,
        "nudge_enabled": True,
    }


def _filter_by_pref(db, user_ids: list[str], pref_key: str) -> list[str]:
    """Return only user IDs whose given notification preference is True."""
    if not user_ids:
        return []
    res = db.table("notification_preferences") \
        .select(f"user_id, {pref_key}") \
        .in_("user_id", user_ids) \
        .execute()
    pref_map = {row["user_id"]: row.get(pref_key, True) for row in (res.data or [])}
    # Users with no row default to enabled
    return [uid for uid in user_ids if pref_map.get(uid, True)]
