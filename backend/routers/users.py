"""User profile endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from middleware.auth import get_current_user
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
    """Get another user's public profile."""
    cached = await cache_get(f"user:{user_id}")
    if cached:
        return cached

    db = get_supabase()
    result = db.table("profiles").select("*").eq("id", user_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="User not found.")

    profile = result.data[0]
    await cache_set(f"user:{user_id}", profile, ttl_seconds=900)
    return profile
