"""LockdIN FastAPI Application — Entry Point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import get_settings
from services.cache import check_redis_health
from services.ai_scorer import check_ollama_health

# Import routers
from routers import auth, sessions, users, leaderboard, buddy, friends, notifications

app = FastAPI(
    title="LockdIN API",
    description="Accountability tracker backend — sessions, streaks, leaderboards, and more.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS — allow frontend to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://localhost:80",
        "http://localhost:3000",
        "http://127.0.0.1",
        "https://pgrtaxjxmngwjmrzfbrc.supabase.co",
    ],
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


@app.get("/health")
async def health_check():
    """Health check endpoint — used by Docker/K8s to verify the service is alive."""
    redis_ok = await check_redis_health()
    ollama_ok = await check_ollama_health()

    return {
        "status": "ok",
        "version": "1.0.0",
        "services": {
            "api": "healthy",
            "redis": "healthy" if redis_ok else "unavailable",
            "ollama": "healthy" if ollama_ok else "unavailable",
            "database": "healthy"  # Supabase is always available
        }
    }


@app.get("/")
async def root():
    return {"message": "LockdIN API is running. Visit /docs for API documentation."}
