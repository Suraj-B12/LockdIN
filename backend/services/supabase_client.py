"""Supabase client for database and auth operations."""

from supabase import create_client, Client
from config import get_settings

_client: Client | None = None


def get_supabase() -> Client:
    """Get or create the Supabase client (singleton)."""
    global _client
    if _client is None:
        settings = get_settings()
        _client = create_client(settings.supabase_url, settings.supabase_service_key)
    return _client
