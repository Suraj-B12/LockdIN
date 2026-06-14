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

    # OpenRouter (AI scoring) — primary + two fallbacks, tried in order.
    # Free models rotate and get rate-limited; verified live 2026-06-14:
    # gpt-oss-120b + gpt-oss-20b respond reliably (HTTP 200), gemma-4-31b-it
    # recovers after transient 429s. llama-3.3-70b-instruct:free was persistently
    # 429 (rate-limited upstream) so it was dropped in favour of gpt-oss-20b.
    openrouter_api_key: str = ""
    openrouter_model: str = "openai/gpt-oss-120b:free"
    openrouter_fallback_model: str = "openai/gpt-oss-20b:free"
    openrouter_fallback_model_2: str = "google/gemma-4-31b-it:free"

    # Legacy local services — kept optional so old .env files don't break,
    # but no longer required (Ollama replaced by OpenRouter, Redis by in-process cache).
    redis_url: str = "redis://redis:6379"
    ollama_url: str = "http://ollama:11434"

    # App
    jwt_secret: str
    environment: str = "development"

    # Cron / scheduler. On a free host that sleeps, set scheduler_enabled=false
    # and drive the periodic jobs from an EXTERNAL cron hitting /api/cron/* with
    # this shared secret (see routers/cron.py).
    cron_secret: str = ""
    scheduler_enabled: bool = True

    # Extra browser origin allowed by CORS (e.g. the deployed frontend URL).
    frontend_origin: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance — loaded once, reused everywhere."""
    return Settings()
