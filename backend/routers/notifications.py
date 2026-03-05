"""OneSignal notification endpoints and service."""

from fastapi import APIRouter, Depends, HTTPException
import httpx
from middleware.auth import get_current_user
from services.supabase_client import get_supabase
from config import get_settings

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


async def send_notification(
    user_ids: list[str],
    title: str,
    message: str,
    data: dict | None = None
):
    """Send a push notification to specific users via OneSignal."""
    settings = get_settings()

    # Get OneSignal external_ids (we use Supabase user IDs as external IDs)
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
        print(f"Notification error: {e}")
        return None


async def notify_friends_session_started(user_id: str, user_name: str):
    """Notify all friends that this user started a session."""
    friend_ids = await _get_friend_ids(user_id)
    if friend_ids:
        await send_notification(
            friend_ids,
            "🔥 Lock In Alert",
            f"{user_name} just locked in!",
            {"type": "session_started", "user_id": user_id}
        )


async def notify_friends_session_finished(user_id: str, user_name: str, duration_min: int, score: int):
    """Notify all friends that this user finished a session."""
    friend_ids = await _get_friend_ids(user_id)
    if friend_ids:
        hours = duration_min // 60
        mins = duration_min % 60
        time_str = f"{hours}h {mins}m" if hours > 0 else f"{mins}m"
        await send_notification(
            friend_ids,
            "✅ Session Complete",
            f"{user_name} finished {time_str} of focus. Score: {score}/100",
            {"type": "session_finished", "user_id": user_id, "score": score}
        )


@router.post("/nudge/{friend_id}")
async def nudge_friend(friend_id: str, user: dict = Depends(get_current_user)):
    """Send a nudge notification to a friend."""
    db = get_supabase()

    # Verify friendship
    friendship = db.table("friendships").select("id").eq("status", "accepted") \
        .or_(
            f"and(user_id.eq.{user['id']},friend_id.eq.{friend_id}),"
            f"and(user_id.eq.{friend_id},friend_id.eq.{user['id']})"
        ).execute()

    if not friendship.data:
        raise HTTPException(status_code=403, detail="You must be friends to nudge.")

    await send_notification(
        [friend_id],
        "👀 Nudge!",
        f"{user['name']} is wondering where you are. Time to lock in!",
        {"type": "nudge", "from_user_id": user["id"]}
    )

    return {"message": "Nudge sent!"}


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
