"""Buddy system endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from middleware.auth import get_current_user, valid_uuid
from services.supabase_client import get_supabase
from services.streak_calculator import refresh_streak_for_user
from models.schemas import BuddyResponse, BuddyUpdate

router = APIRouter(prefix="/api/buddy", tags=["Buddy"])


@router.get("/", response_model=BuddyResponse)
async def get_my_buddy(user: dict = Depends(get_current_user)):
    """Get the current user's buddy."""
    db = get_supabase()
    result = db.table("buddies").select("*").eq("user_id", user["id"]).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Buddy not found. This shouldn't happen!")

    # Self-heal: streak counters are only written on session finish, so a missed
    # day would leave a stale `current_streak`. Recompute live before returning.
    return refresh_streak_for_user(user["id"], buddy_row=result.data[0])


@router.put("/", response_model=BuddyResponse)
async def update_my_buddy(body: BuddyUpdate, user: dict = Depends(get_current_user)):
    """Update buddy name or type."""
    db = get_supabase()

    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update.")

    result = db.table("buddies").update(update_data).eq("user_id", user["id"]).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Buddy not found.")

    # Heal the streak on the way out so a rename never repopulates the client
    # cache with a stale current_streak.
    return refresh_streak_for_user(user["id"], buddy_row=result.data[0])


@router.get("/friend/{friend_id}", response_model=BuddyResponse)
async def get_friend_buddy(friend_id: str, user: dict = Depends(get_current_user)):
    """View a friend's buddy (for social features)."""
    friend_id = valid_uuid(friend_id, not_found_detail="Buddy not found.")
    db = get_supabase()

    # Verify they are friends
    friendship = db.table("friendships") \
        .select("id") \
        .eq("status", "accepted") \
        .or_(
            f"and(user_id.eq.{user['id']},friend_id.eq.{friend_id}),"
            f"and(user_id.eq.{friend_id},friend_id.eq.{user['id']})"
        ) \
        .execute()

    if not friendship.data:
        raise HTTPException(status_code=403, detail="You must be friends to view their buddy.")

    result = db.table("buddies").select("*").eq("user_id", friend_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Buddy not found.")

    # Show the friend's live streak, but DON'T write their row from our read
    # (persist=False) — only the owner's own read or the cron heals the row.
    return refresh_streak_for_user(
        friend_id, buddy_row=result.data[0], persist=(friend_id == user["id"])
    )
