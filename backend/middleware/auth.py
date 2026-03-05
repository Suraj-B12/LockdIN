"""Authentication middleware — verifies Supabase JWT on every request."""

from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from services.supabase_client import get_supabase

security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Extract and verify the JWT token from the Authorization header.
    Returns the user data (id, email, etc.) if valid.
    Raises 401 if the token is invalid or expired.
    """
    token = credentials.credentials

    try:
        db = get_supabase()
        user_response = db.auth.get_user(token)
        user = user_response.user

        if not user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        return {
            "id": str(user.id),
            "email": user.email,
            "name": user.user_metadata.get("full_name", user.user_metadata.get("name", "User")),
            "avatar": user.user_metadata.get("avatar_url", user.user_metadata.get("picture"))
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
