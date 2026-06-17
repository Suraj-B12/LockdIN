"""Email notification service — renders HTML templates and sends via OneSignal Email channel."""

from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape
import httpx
from config import get_settings

# Jinja2 environment pointing at our templates folder
_TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
_jinja_env = Environment(
    loader=FileSystemLoader(str(_TEMPLATES_DIR)),
    autoescape=select_autoescape(["html"]),
)


def render_template(template_name: str, context: dict) -> str:
    """Render a Jinja2 HTML template with the given context variables."""
    template = _jinja_env.get_template(template_name)
    return template.render(**context)


async def send_email_via_onesignal(
    user_ids: list[str],
    subject: str,
    html_body: str,
) -> dict | None:
    """
    Send an email to one or more users via OneSignal's email channel.
    Users must have their email registered as an external_id alias in OneSignal.
    """
    settings = get_settings()
    payload = {
        "app_id": settings.onesignal_app_id,
        "include_aliases": {"external_id": user_ids},
        "target_channel": "email",
        "email_subject": subject,
        "email_body": html_body,
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                "https://api.onesignal.com/notifications",
                json=payload,
                headers={
                    "Authorization": f"Key {settings.onesignal_api_key}",
                    "Content-Type": "application/json",
                },
            )
            result = response.json()
            if response.status_code not in (200, 201):
                print(f"[email] OneSignal error: {result}")
            return result
    except Exception as e:
        print(f"[email] Send failed: {e}")
        return None


# ============================================================
#  High-level email senders — one per notification type
# ============================================================

_BASE_URL = "http://localhost"  # Overridden per environment; fine for now


def _get_urls(user_id: str) -> dict:
    """Build standard URL context values.

    The unsubscribe link must carry the per-user unsubscribe_token (the public
    unsubscribe endpoint now requires it). We fetch it here so individual email
    senders don't all need to thread the token through their signatures. If the
    token can't be fetched, the unsubscribe link is still rendered but will be
    rejected by the endpoint (fail-closed) — better than leaking an open link.
    """
    token = _get_unsubscribe_token(user_id)
    unsubscribe_url = f"{_BASE_URL}/api/notifications/unsubscribe/{user_id}"
    if token:
        unsubscribe_url += f"?token={token}"
    return {
        "dashboard_url": f"{_BASE_URL}/dashboard.html",
        "preferences_url": f"{_BASE_URL}/profile.html#notifications",
        "unsubscribe_url": unsubscribe_url,
    }


def _get_unsubscribe_token(user_id: str) -> str | None:
    """Look up a user's unsubscribe token from notification_preferences."""
    try:
        from services.supabase_client import get_supabase
        db = get_supabase()
        res = db.table("notification_preferences") \
            .select("unsubscribe_token") \
            .eq("user_id", user_id) \
            .execute()
        if res.data:
            return res.data[0].get("unsubscribe_token")
    except Exception:
        pass
    return None


async def send_inactivity_reminder(
    user_id: str,
    display_name: str,
    days_inactive: int,
    buddy_name: str,
    buddy_mood_label: str,
    buddy_emoji: str,
    current_streak: int,
) -> None:
    """Send an inactivity reminder email (user hasn't logged a session for 2+ days)."""
    context = {
        "user_name": display_name.split()[0] if display_name else "there",
        "days_inactive": days_inactive,
        "buddy_name": buddy_name,
        "buddy_mood_label": buddy_mood_label,
        "buddy_emoji": buddy_emoji,
        "current_streak": current_streak,
        **_get_urls(user_id),
    }
    html = render_template("inactivity_reminder.html", context)
    await send_email_via_onesignal(
        [user_id],
        subject=f"Pick up where you left off — it's been {days_inactive} days",
        html_body=html,
    )


async def send_friend_session_alert_email(
    recipient_user_ids: list[str],
    recipient_user_id_for_urls: str,
    friend_name: str,
    user_name: str,
) -> None:
    """Send email to friends when a user starts a session."""
    context = {
        "friend_name": friend_name,
        "friend_initial": (friend_name[0].upper() if friend_name else "?"),
        "user_name": user_name,
        "user_initial": (user_name[0].upper() if user_name else "?"),
        **_get_urls(recipient_user_id_for_urls),
    }
    html = render_template("friend_session_started.html", context)
    await send_email_via_onesignal(
        recipient_user_ids,
        subject=f"{friend_name} just locked in! 🔥 Don't fall behind",
        html_body=html,
    )


async def send_buddy_mood_alert_email(
    user_id: str,
    display_name: str,
    buddy_name: str,
    mood_level: int,
    previous_mood_label: str,
    longest_streak: int,
    days_since_session: int,
) -> None:
    """Send email when buddy mood drops to devastated (mood_level == 1)."""
    # mood_percent maps mood_level (1-10) to a bar fill percentage (10% to 100%)
    mood_percent = max(10, mood_level * 10)
    context = {
        "user_name": display_name.split()[0] if display_name else "there",
        "buddy_name": buddy_name,
        "mood_percent": mood_percent,
        "previous_mood_label": previous_mood_label,
        "longest_streak": longest_streak,
        "days_since_session": days_since_session,
        **_get_urls(user_id),
    }
    html = render_template("buddy_mood_alert.html", context)
    await send_email_via_onesignal(
        [user_id],
        subject=f"{buddy_name} is ready when you are — a quick session gets you both going",
        html_body=html,
    )
