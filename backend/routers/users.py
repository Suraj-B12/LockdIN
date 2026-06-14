"""User profile endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from middleware.auth import get_current_user, valid_uuid
from services.supabase_client import get_supabase
from services.cache import cache_get, cache_set
from models.schemas import ProfileResponse, ProfileUpdate

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(user: dict = Depends(get_current_user)):
    """Get the current user's profile."""
    cached = await cache_get(f"user:{user['id']}")
    if cached:
        return cached

    db = get_supabase()
    result = db.table("profiles").select("*").eq("id", user["id"]).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found.")

    profile = result.data[0]
    await cache_set(f"user:{user['id']}", profile, ttl_seconds=900)  # 15 min
    return profile


@router.put("/me", response_model=ProfileResponse)
async def update_my_profile(body: ProfileUpdate, user: dict = Depends(get_current_user)):
    """Update the current user's profile (display name, avatar)."""
    db = get_supabase()

    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update.")

    result = db.table("profiles").update(update_data).eq("id", user["id"]).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found.")

    from services.cache import cache_delete
    await cache_delete(f"user:{user['id']}")

    return result.data[0]


@router.get("/{user_id}", response_model=ProfileResponse)
async def get_user_profile(user_id: str, user: dict = Depends(get_current_user)):
    """Get another user's profile.

    AUTHZ: the service-role key bypasses RLS, so we authorize explicitly. A user
    may view their OWN profile or that of an ACCEPTED friend; anyone else gets
    404 (we don't confirm existence to non-friends). The `invite_code` is a
    friend-add capability secret and `email` is PII, so for a friend we return
    the profile but blank the invite_code (only the owner ever sees their code).
    """
    user_id = valid_uuid(user_id, not_found_detail="User not found.")

    # Fast path: requesting self → delegate to the full, cached own-profile view.
    if user_id == user["id"]:
        return await get_my_profile(user)

    db = get_supabase()

    # Must be accepted friends in either direction to view the profile.
    friendship = db.table("friendships") \
        .select("id") \
        .eq("status", "accepted") \
        .or_(
            f"and(user_id.eq.{user['id']},friend_id.eq.{user_id}),"
            f"and(user_id.eq.{user_id},friend_id.eq.{user['id']})"
        ) \
        .execute()

    if not friendship.data:
        # Don't leak existence/PII to non-friends.
        raise HTTPException(status_code=404, detail="User not found.")

    # Cache the redacted view under a DISTINCT key so it never poisons the
    # owner's `/me` cache (which legitimately contains the invite_code).
    cache_key = f"user:public:{user_id}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    result = db.table("profiles").select("*").eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found.")

    profile = dict(result.data[0])
    profile["invite_code"] = None  # never expose another user's invite code
    await cache_set(cache_key, profile, ttl_seconds=900)
    return profile
