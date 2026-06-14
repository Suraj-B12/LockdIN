"""Friend system — add, accept, reject, list friends."""

import asyncio
from fastapi import APIRouter, Depends, HTTPException
from middleware.auth import get_current_user, valid_uuid
from services.supabase_client import get_supabase
from services.cache import rate_limit_ok
from models.schemas import FriendRequest, FriendResponse, FriendAction
from routers.notifications import notify_friend_request

router = APIRouter(prefix="/api/friends", tags=["Friends"])

# Anti-spam: cap how often a user can fire a NEW friend request to the same
# target, and how fast they can fire requests in general. Repeatedly re-sending
# to someone who rejected (which deletes the row) is the main abuse vector.
_FRIEND_REQ_PER_TARGET_COOLDOWN = 60 * 60  # 1 hour to the same target
_FRIEND_REQ_GLOBAL_COOLDOWN = 5            # >= 5s between any two new requests


@router.get("/", response_model=list[FriendResponse])
async def list_friends(user: dict = Depends(get_current_user)):
    """List all accepted friends with their profile info."""
    db = get_supabase()

    result = db.table("friendships") \
        .select("*, profiles!friendships_friend_id_fkey(display_name, avatar_url)") \
        .eq("user_id", user["id"]) \
        .eq("status", "accepted") \
        .execute()

    # Also get friendships where current user is the friend_id
    reverse = db.table("friendships") \
        .select("*, profiles!friendships_user_id_fkey(display_name, avatar_url)") \
        .eq("friend_id", user["id"]) \
        .eq("status", "accepted") \
        .execute()

    friends = []
    for row in result.data:
        profile = row.pop("profiles", {}) or {}
        row["friend_name"] = profile.get("display_name")
        row["friend_avatar"] = profile.get("avatar_url")
        friends.append(row)

    for row in reverse.data:
        profile = row.pop("profiles", {}) or {}
        friends.append({
            **row,
            "friend_name": profile.get("display_name"),
            "friend_avatar": profile.get("avatar_url")
        })

    return friends


@router.get("/pending", response_model=list[FriendResponse])
async def list_pending_requests(user: dict = Depends(get_current_user)):
    """List incoming friend requests waiting for acceptance."""
    db = get_supabase()

    result = db.table("friendships") \
        .select("*, profiles!friendships_user_id_fkey(display_name, avatar_url)") \
        .eq("friend_id", user["id"]) \
        .eq("status", "pending") \
        .execute()

    friends = []
    for row in result.data:
        profile = row.pop("profiles", {}) or {}
        row["friend_name"] = profile.get("display_name")
        row["friend_avatar"] = profile.get("avatar_url")
        friends.append(row)

    return friends


@router.get("/sent", response_model=list[FriendResponse])
async def list_sent_requests(user: dict = Depends(get_current_user)):
    """List outgoing friend requests the current user has sent and are still pending."""
    db = get_supabase()

    result = db.table("friendships") \
        .select("*, profiles!friendships_friend_id_fkey(display_name, avatar_url)") \
        .eq("user_id", user["id"]) \
        .eq("status", "pending") \
        .execute()

    friends = []
    for row in result.data:
        profile = row.pop("profiles", {}) or {}
        row["friend_name"] = profile.get("display_name")
        row["friend_avatar"] = profile.get("avatar_url")
        friends.append(row)

    return friends


@router.post("/request", response_model=FriendResponse)
async def send_friend_request(body: FriendRequest, user: dict = Depends(get_current_user)):
    """Send a friend request via invite code or email."""
    db = get_supabase()

    # Normalize inputs and require at least one NON-EMPTY string.
    invite_code = (body.invite_code or "").strip()
    email = (body.email or "").strip()

    if not invite_code and not email:
        raise HTTPException(
            status_code=400,
            detail="Provide a non-empty invite_code or email.",
        )

    # Early self-add guard by the supplied identifier (before any DB lookup):
    # don't let a user friend themselves via their own email/invite code.
    if email and user.get("email") and email.lower() == user["email"].lower():
        raise HTTPException(status_code=400, detail="Cannot friend yourself.")

    # Find the target user (invite_code takes precedence if both supplied).
    if invite_code:
        target = db.table("profiles").select("id, invite_code").eq("invite_code", invite_code).execute()
    else:
        target = db.table("profiles").select("id, invite_code").eq("email", email).execute()

    if not target.data:
        raise HTTPException(status_code=404, detail="User not found.")

    friend_id = target.data[0]["id"]

    # Self-add guard by resolved id (covers the invite_code path).
    if friend_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot friend yourself.")

    # Check if a friendship already exists in EITHER direction.
    existing = db.table("friendships") \
        .select("id, status, user_id, friend_id") \
        .or_(
            f"and(user_id.eq.{user['id']},friend_id.eq.{friend_id}),"
            f"and(user_id.eq.{friend_id},friend_id.eq.{user['id']})"
        ) \
        .execute()

    if existing.data:
        # Handle gracefully — never create a duplicate. Return the existing row
        # for pending/accepted so the client can treat it as idempotent; block
        # only on a 'blocked' relationship.
        row = existing.data[0]
        status = row["status"]
        if status == "blocked":
            raise HTTPException(status_code=409, detail="This relationship is blocked.")
        # pending or accepted → already exists; surface the existing friendship.
        return row

    # Anti-spam: only NEW requests are throttled (the idempotent branch above
    # already returned). Check the per-target cooldown FIRST (more specific,
    # longer window) so re-spamming one person doesn't burn the global budget,
    # then the short global rate limit against rapid-fire to many targets.
    if not await rate_limit_ok(f"freq:{user['id']}:{friend_id}", _FRIEND_REQ_PER_TARGET_COOLDOWN):
        raise HTTPException(
            status_code=429,
            detail="You've recently sent this person a request. Give them time to respond.",
        )
    if not await rate_limit_ok(f"freq:any:{user['id']}", _FRIEND_REQ_GLOBAL_COOLDOWN):
        raise HTTPException(
            status_code=429,
            detail="You're sending friend requests too quickly. Slow down a moment.",
        )

    try:
        result = db.table("friendships").insert({
            "user_id": user["id"],
            "friend_id": friend_id,
            "status": "pending"
        }).execute()
    except Exception:
        # The check-then-insert above isn't atomic; a concurrent request can
        # win the UNIQUE(user_id, friend_id) race. Treat that as idempotent:
        # re-fetch and return the now-existing row instead of a 500.
        existing = db.table("friendships") \
            .select("id, status, user_id, friend_id, created_at") \
            .or_(
                f"and(user_id.eq.{user['id']},friend_id.eq.{friend_id}),"
                f"and(user_id.eq.{friend_id},friend_id.eq.{user['id']})"
            ) \
            .execute()
        if existing.data:
            return existing.data[0]
        raise HTTPException(status_code=500, detail="Could not create friend request.")

    if not result.data:
        raise HTTPException(status_code=500, detail="Could not create friend request.")

    # Notify the target user (fire-and-forget)
    asyncio.create_task(
        notify_friend_request(friend_id, user.get("name", "Someone"))
    )

    return result.data[0]


@router.put("/{friendship_id}", response_model=FriendResponse)
async def respond_to_request(
    friendship_id: str,
    body: FriendAction,
    user: dict = Depends(get_current_user)
):
    """Accept, reject, or block a friend request."""
    friendship_id = valid_uuid(friendship_id, not_found_detail="Pending request not found.")
    db = get_supabase()

    # Only the recipient can accept/reject
    friendship = db.table("friendships") \
        .select("*") \
        .eq("id", friendship_id) \
        .eq("friend_id", user["id"]) \
        .eq("status", "pending") \
        .execute()

    if not friendship.data:
        raise HTTPException(status_code=404, detail="Pending request not found.")

    new_status = body.action
    if new_status == "reject":
        # Delete the friendship entirely. Echo the row back with a "rejected"
        # status so the client sees the resolved state (the row no longer exists).
        db.table("friendships").delete().eq("id", friendship_id).execute()
        rejected = dict(friendship.data[0])
        rejected["status"] = "rejected"
        return rejected

    result = db.table("friendships") \
        .update({"status": new_status}) \
        .eq("id", friendship_id) \
        .execute()

    if not result.data:
        # Lost a race (row deleted/changed between check and update).
        raise HTTPException(status_code=404, detail="Pending request not found.")

    return result.data[0]


@router.delete("/{friendship_id}")
async def remove_friend(friendship_id: str, user: dict = Depends(get_current_user)):
    """Remove a friend."""
    friendship_id = valid_uuid(friendship_id, not_found_detail="Friendship not found.")
    db = get_supabase()

    result = db.table("friendships") \
        .delete() \
        .eq("id", friendship_id) \
        .or_(f"user_id.eq.{user['id']},friend_id.eq.{user['id']}") \
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Friendship not found.")

    return {"message": "Friend removed."}
