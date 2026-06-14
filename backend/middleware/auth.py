"""Authentication middleware — verifies Supabase JWT on every request."""

import logging
from uuid import UUID

from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from services.supabase_client import get_supabase

log = logging.getLogger(__name__)

security = HTTPBearer()


def valid_uuid(value: str, *, not_found_detail: str = "Not found.") -> str:
    """Validate that an id path param is a well-formed UUID.

    Our id columns are UUIDs and we interpolate these values into PostgREST
    filters; a malformed id would otherwise reach Postgres as an invalid-uuid
    error (HTTP 500). Returns the canonical string form, or raises 404 so a
    bogus id is indistinguishable from a missing/Unauthorized row.
    """
    try:
        return str(UUID(str(value)))
    except (ValueError, AttributeError, TypeError):
        raise HTTPException(status_code=404, detail=not_found_detail)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Extract and verify the JWT token from the Authorization header.
    Returns the user data (id, email, etc.) if valid.
    Raises 401 if the token is invalid or expired.

    Never echoes the underlying exception/token back to the client — auth
    failures return a generic 401 and the detail is logged server-side only.
    """
    token = credentials.credentials

    try:
        db = get_supabase()
        user_response = db.auth.get_user(token)
        user = getattr(user_response, "user", None)

        if not user or not getattr(user, "id", None):
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        metadata = user.user_metadata or {}
        return {
            "id": str(user.id),
            "email": getattr(user, "email", None),
            "name": metadata.get("full_name", metadata.get("name", "User")),
            "avatar": metadata.get("avatar_url", metadata.get("picture")),
        }
    except HTTPException:
        raise
    except Exception:
        # Log full detail server-side; return a generic message to the client.
        log.warning("Token verification failed", exc_info=True)
        raise HTTPException(status_code=401, detail="Invalid or expired token")
