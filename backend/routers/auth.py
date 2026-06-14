"""Authentication endpoints — login status, logout, token refresh."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from middleware.auth import get_current_user
from services.supabase_client import get_supabase

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Auth"])


class TokenRefreshRequest(BaseModel):
    refresh_token: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    user: dict


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Return the currently authenticated user's info from their JWT."""
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "avatar": user["avatar"],
        "authenticated": True
    }


@router.post("/logout")
async def logout(user: dict = Depends(get_current_user)):
    """
    Server-side logout. Supabase will invalidate the session.
    The frontend should also call supabase.auth.signOut().
    """
    try:
        db = get_supabase()
        # Sign out the user on the server side (invalidates all sessions)
        db.auth.sign_out()
    except Exception:
        pass  # Best-effort — frontend handles its own cleanup

    return {"message": "Logged out successfully"}


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: TokenRefreshRequest):
    """
    Exchange a refresh token for a new access token.
    Called by the frontend when the access token expires.
    """
    try:
        db = get_supabase()
        response = db.auth.refresh_session(body.refresh_token)
        session = getattr(response, "session", None)
        user = getattr(response, "user", None)

        if not session or not user:
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        metadata = user.user_metadata or {}
        return {
            "access_token": session.access_token,
            "refresh_token": session.refresh_token,
            "expires_in": session.expires_in,
            "user": {
                "id": str(user.id),
                "email": getattr(user, "email", None),
                "name": metadata.get("full_name", metadata.get("name", "User")),
                "avatar": metadata.get("avatar_url", metadata.get("picture")),
            },
        }
    except HTTPException:
        raise
    except Exception:
        # Don't leak the underlying auth-library error to the client.
        log.warning("Token refresh failed", exc_info=True)
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
