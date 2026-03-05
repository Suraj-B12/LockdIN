"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_key: str
    database_url: str

    # Google OAuth
    google_client_id: str
    google_client_secret: str

    # OneSignal
    onesignal_app_id: str
    onesignal_api_key: str

    # Redis
    redis_url: str = "redis://redis:6379"

    # Ollama
    ollama_url: str = "http://ollama:11434"

    # App
    jwt_secret: str
    environment: str = "development"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance — loaded once, reused everywhere."""
    return Settings()
