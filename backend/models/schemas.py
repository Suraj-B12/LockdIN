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
    # Capped at a standard max URL length so we don't persist oversized blobs.
    avatar_url: Optional[str] = Field(None, max_length=2048)


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
    breakdown: Optional[dict] = None  # algorithm factor breakdown (additive)


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
    # Present once migration 006 is applied; None on older DBs (additive).
    streak_freezes: Optional[int] = None


class BuddyUpdate(BaseModel):
    # buddy_type is a free-form string the frontend normalizes to an avatar
    # index (e.g. "Avatar 7"); we only cap its length to avoid storing junk.
    buddy_type: Optional[str] = Field(None, min_length=1, max_length=50)
    buddy_name: Optional[str] = Field(None, min_length=1, max_length=30)


# ========== FRIEND PROFILE (consolidated public view) ==========

class FriendProfileResponse(BaseModel):
    """A friend's full public profile in one payload: identity + buddy + finished
    session history (the client derives the activity heatmap, stats, and feed
    from `sessions`). REDACTED — never carries email or invite_code."""
    id: UUID
    display_name: str
    avatar_url: Optional[str] = None
    created_at: datetime
    last_active_at: datetime
    buddy: Optional[BuddyResponse] = None
    sessions: list[SessionResponse] = Field(default_factory=list)
    # Current shared streak with the VIEWER (days you both completed). None when
    # viewing your own overview.
    shared_streak: Optional[int] = None


# ========== FRIENDS ==========

class FriendRequest(BaseModel):
    """Send friend request by invite code, email, or user id (global ranks)."""
    invite_code: Optional[str] = None
    email: Optional[str] = None
    user_id: Optional[str] = None


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


# ========== FRIEND ACTIVITY RECAP (the "while you were gone" inbox) ==========

class FriendActivityItem(BaseModel):
    friend_id: UUID
    friend_name: Optional[str] = None
    friend_avatar: Optional[str] = None
    buddy_name: Optional[str] = None
    buddy_type: Optional[str] = None
    mood_level: Optional[int] = None
    # Aggregated over finished sessions since `since`.
    sessions_count: int = 0
    total_seconds: int = 0
    best_score: Optional[int] = None
    last_finished_at: Optional[datetime] = None
    # True if they finished at least one session since `since`.
    active: bool = False


class FriendActivityResponse(BaseModel):
    since: datetime
    generated_at: datetime
    active_count: int
    idle_count: int
    items: list[FriendActivityItem] = Field(default_factory=list)


# ========== REACTIONS ==========

REACTION_EMOJI = ("fire", "clap", "muscle", "eyes", "brain", "hundred")


class ReactionToggle(BaseModel):
    emoji: str = Field(..., pattern="^(fire|clap|muscle|eyes|brain|hundred)$")


class ReactionState(BaseModel):
    # emoji -> count for this session, plus the emoji the requester has set.
    counts: dict[str, int] = Field(default_factory=dict)
    mine: list[str] = Field(default_factory=list)


class ReactionBatchRequest(BaseModel):
    session_ids: list[UUID] = Field(default_factory=list)


class ReactionReceived(BaseModel):
    # A reaction a friend left on one of the caller's own sessions.
    actor_id: UUID
    actor_name: str
    actor_avatar: Optional[str] = None
    emoji: str
    session_id: UUID
    created_at: datetime


# ========== ROOMS (Lock In Together) ==========

class RoomParticipantOut(BaseModel):
    user_id: UUID
    display_name: str
    avatar_url: Optional[str] = None
    status: str  # joined | focusing | done | left
    focus_seconds: int = 0
    live: bool = False  # last_seen within the liveness window


class RoomResponse(BaseModel):
    id: UUID
    code: str
    host_id: UUID
    status: str  # open | active | closed
    created_at: datetime
    started_at: Optional[datetime] = None
    is_host: bool = False
    combined_seconds: int = 0
    live_count: int = 0
    participants: list[RoomParticipantOut] = Field(default_factory=list)


class RoomJoin(BaseModel):
    code: str = Field(..., min_length=3, max_length=12)


class RoomHeartbeat(BaseModel):
    focus_seconds: Optional[int] = Field(None, ge=0, le=86_400)
    focusing: Optional[bool] = None


# ----- Ephemeral in-room chat (NOT persisted) -----

class ChatSend(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)


class ChatMessageOut(BaseModel):
    id: int
    user_id: UUID
    display_name: str
    text: str
    ts: float


class ChatPollResponse(BaseModel):
    messages: list[ChatMessageOut] = Field(default_factory=list)
    latest_id: int = 0


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


class GlobalLeaderboardEntry(LeaderboardEntry):
    # Relationship to the viewer: self | friends | pending_out | pending_in | blocked | none
    friend_status: str = "none"


class GlobalLeaderboardResponse(BaseModel):
    period: str
    entries: list[GlobalLeaderboardEntry]
    your_rank: Optional[int] = None


# ========== HEALTH ==========

class HealthResponse(BaseModel):
    status: str
    version: str
    services: dict[str, str]


# ========== NOTIFICATION PREFERENCES ==========

class NotificationPrefsResponse(BaseModel):
    user_id: UUID
    push_enabled: bool
    email_enabled: bool
    friend_session_alerts: bool
    inactivity_reminders: bool
    buddy_mood_alerts: bool
    nudge_enabled: bool
    # Per-user token guarding the public one-click unsubscribe link (additive).
    unsubscribe_token: Optional[UUID] = None


class NotificationPrefsUpdate(BaseModel):
    push_enabled: Optional[bool] = None
    email_enabled: Optional[bool] = None
    friend_session_alerts: Optional[bool] = None
    inactivity_reminders: Optional[bool] = None
    buddy_mood_alerts: Optional[bool] = None
    nudge_enabled: Optional[bool] = None
