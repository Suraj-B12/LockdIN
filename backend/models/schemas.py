"""Pydantic schemas for request/response validation."""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from uuid import UUID


# ========== USER / PROFILE ==========

class ProfileResponse(BaseModel):
    id: UUID
    email: str
    display_name: str
    avatar_url: Optional[str] = None
    invite_code: Optional[str] = None
    created_at: datetime
    last_active_at: datetime


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=50)
    avatar_url: Optional[str] = None


# ========== SESSION ==========

class SessionStart(BaseModel):
    """No fields needed — server sets started_at automatically."""
    pass


class SessionWorkLog(BaseModel):
    work_log: str = Field(..., min_length=1, max_length=2000)


class SessionResponse(BaseModel):
    id: UUID
    user_id: UUID
    started_at: datetime
    paused_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    total_seconds: int
    pause_count: int
    status: str
    work_log: Optional[str] = None
    session_date: date
    ai_score: Optional[int] = None
    ai_summary: Optional[str] = None


# ========== AI SCORE ==========

class AIScoreResponse(BaseModel):
    score: int = Field(..., ge=0, le=100)
    summary: str
    model_used: str
    scored_at: datetime


# ========== STREAK ==========

class StreakDay(BaseModel):
    streak_date: date
    daily_seconds: int
    daily_score: int
    completed: bool


class StreakSummary(BaseModel):
    current_streak: int
    longest_streak: int
    total_days: int
    total_seconds: int
    calendar: list[StreakDay]


# ========== BUDDY ==========

class BuddyResponse(BaseModel):
    id: UUID
    buddy_type: str
    buddy_name: str
    mood_level: int = Field(..., ge=1, le=10)
    current_streak: int
    longest_streak: int
    last_session_date: Optional[date] = None


class BuddyUpdate(BaseModel):
    buddy_type: Optional[str] = None
    buddy_name: Optional[str] = Field(None, min_length=1, max_length=30)


# ========== FRIENDS ==========

class FriendRequest(BaseModel):
    """Send friend request by invite code or email."""
    invite_code: Optional[str] = None
    email: Optional[str] = None


class FriendResponse(BaseModel):
    id: UUID
    user_id: UUID
    friend_id: UUID
    status: str
    created_at: datetime
    # Populated from join
    friend_name: Optional[str] = None
    friend_avatar: Optional[str] = None


class FriendAction(BaseModel):
    action: str = Field(..., pattern="^(accept|reject|block)$")


# ========== LEADERBOARD ==========

class LeaderboardEntry(BaseModel):
    user_id: UUID
    display_name: str
    avatar_url: Optional[str] = None
    total_score: int
    total_seconds: int
    rank: int


class LeaderboardResponse(BaseModel):
    period: str  # "daily", "weekly", "alltime"
    entries: list[LeaderboardEntry]
    your_rank: Optional[int] = None


# ========== HEALTH ==========

class HealthResponse(BaseModel):
    status: str
    version: str
    services: dict[str, str]
