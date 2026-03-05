"""Friend system — add, accept, reject, list friends."""

from fastapi import APIRouter, Depends, HTTPException
from middleware.auth import get_current_user
from services.supabase_client import get_supabase
from models.schemas import FriendRequest, FriendResponse, FriendAction

router = APIRouter(prefix="/api/friends", tags=["Friends"])


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


@router.post("/request", response_model=FriendResponse)
async def send_friend_request(body: FriendRequest, user: dict = Depends(get_current_user)):
    """Send a friend request via invite code or email."""
    db = get_supabase()

    if not body.invite_code and not body.email:
        raise HTTPException(status_code=400, detail="Provide either invite_code or email.")

    # Find the target user
    if body.invite_code:
        target = db.table("profiles").select("id").eq("invite_code", body.invite_code).execute()
    else:
        target = db.table("profiles").select("id").eq("email", body.email).execute()

    if not target.data:
        raise HTTPException(status_code=404, detail="User not found.")

    friend_id = target.data[0]["id"]

    if friend_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot friend yourself.")

    # Check if friendship already exists
    existing = db.table("friendships") \
        .select("id, status") \
        .or_(
            f"and(user_id.eq.{user['id']},friend_id.eq.{friend_id}),"
            f"and(user_id.eq.{friend_id},friend_id.eq.{user['id']})"
        ) \
        .execute()

    if existing.data:
        status = existing.data[0]["status"]
        raise HTTPException(status_code=409, detail=f"Friendship already exists (status: {status}).")

    result = db.table("friendships").insert({
        "user_id": user["id"],
        "friend_id": friend_id,
        "status": "pending"
    }).execute()

    return result.data[0]


@router.put("/{friendship_id}", response_model=FriendResponse)
async def respond_to_request(
    friendship_id: str,
    body: FriendAction,
    user: dict = Depends(get_current_user)
):
    """Accept, reject, or block a friend request."""
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
        # Delete the friendship entirely
        db.table("friendships").delete().eq("id", friendship_id).execute()
        return friendship.data[0]

    result = db.table("friendships") \
        .update({"status": new_status}) \
        .eq("id", friendship_id) \
        .execute()

    return result.data[0]


@router.delete("/{friendship_id}")
async def remove_friend(friendship_id: str, user: dict = Depends(get_current_user)):
    """Remove a friend."""
    db = get_supabase()

    result = db.table("friendships") \
        .delete() \
        .eq("id", friendship_id) \
        .or_(f"user_id.eq.{user['id']},friend_id.eq.{user['id']}") \
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Friendship not found.")

    return {"message": "Friend removed."}
