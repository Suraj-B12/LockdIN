"""LockdIN FastAPI Application — Entry Point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import get_settings
from services.cache import check_cache_health
from services.ai_scorer import check_ai_health
from services.scheduler import start_scheduler, stop_scheduler

# Import routers
from routers import auth, sessions, users, leaderboard, buddy, friends, notifications, cron


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start the in-process scheduler on boot (unless disabled), stop on shutdown.

    On a free host that sleeps, set SCHEDULER_ENABLED=false and drive the periodic
    jobs via an external cron hitting /api/cron/* instead (see routers/cron.py).
    """
    if get_settings().scheduler_enabled:
        start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="LockdIN API",
    description="Accountability tracker backend — sessions, streaks, leaderboards, and more.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS — allow the frontend to call the API. With the Vercel `/api` rewrite the
# browser sees a same-origin request, but we still allow local dev ports and the
# deployed frontend origin (FRONTEND_ORIGIN) for direct calls.
_settings = get_settings()
_allowed_origins = [
    "http://localhost",
    "http://localhost:80",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1",
    "http://127.0.0.1:5173",
    "https://pgrtaxjxmngwjmrzfbrc.supabase.co",
]
if _settings.frontend_origin:
    _allowed_origins.append(_settings.frontend_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(sessions.router)
app.include_router(users.router)
app.include_router(leaderboard.router)
app.include_router(buddy.router)
app.include_router(friends.router)
app.include_router(notifications.router)
app.include_router(cron.router)


@app.get("/health")
async def health_check():
    """Health check endpoint — used by hosts/uptime pings to verify liveness.

    No external network calls: AI is "configured" if an OpenRouter key is set,
    the cache is in-process, and Supabase is treated as always reachable.
    """
    ai_ok = await check_ai_health()
    cache_ok = await check_cache_health()

    return {
        "status": "ok",
        "version": "1.0.0",
        "services": {
            "api": "healthy",
            "ai": "configured" if ai_ok else "unconfigured",
            "cache": "in-memory" if cache_ok else "unavailable",
            "database": "healthy",  # Supabase is always available
        },
    }


@app.get("/")
async def root():
    return {"message": "LockdIN API is running. Visit /docs for API documentation."}
