/* =====================================================================
   FROZEN API CONTRACT — TypeScript mirror.
   Base /api. All protected routes require Authorization: Bearer <supabase jwt>.
   Dates are ISO-8601; session_date is YYYY-MM-DD.
   These types are the source of truth for every screen agent. Do not drift.
   ===================================================================== */

export type SessionStatus = "active" | "paused" | "finished";

export interface SessionResponse {
  id: string;
  user_id: string;
  started_at: string; // ISO-8601
  paused_at: string | null;
  finished_at: string | null;
  total_seconds: number;
  pause_count: number;
  status: SessionStatus;
  work_log: string | null;
  session_date: string; // YYYY-MM-DD
  /** PROVISIONAL on finish; re-fetch history shortly after for the LLM score. */
  ai_score: number | null;
  ai_summary: string | null;
}

export interface FinishSessionBody {
  /** 1–2000 chars. */
  work_log: string;
}

/* ---- Buddy ---- */
export interface BuddyResponse {
  id: string;
  buddy_type: string;
  buddy_name: string;
  /** 1–10. 1 = Devastated, 10 = Ecstatic. */
  mood_level: number;
  current_streak: number;
  longest_streak: number;
  last_session_date: string | null;
  /** Streak freezes banked (cap 2). null on DBs without migration 006. */
  streak_freezes?: number | null;
}

export interface UpdateBuddyBody {
  buddy_type?: string;
  buddy_name?: string;
}

/* ---- Leaderboard ---- */
export type LeaderboardPeriod = "daily" | "weekly" | "alltime";

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_score: number;
  total_seconds: number;
  rank: number;
}

export interface LeaderboardResponse {
  period: LeaderboardPeriod;
  entries: LeaderboardEntry[]; // top 20
  your_rank: number | null;
}

/* ---- Friends ---- */
export type FriendStatus = "pending" | "accepted" | "blocked" | "rejected";

export interface FriendResponse {
  id: string;
  user_id: string;
  friend_id: string;
  status: FriendStatus | string;
  created_at: string;
  friend_name?: string;
  friend_avatar?: string;
}

export interface FriendRequestBody {
  invite_code?: string;
  email?: string;
}

export type FriendAction = "accept" | "reject" | "block";

export interface FriendActionBody {
  action: FriendAction;
}

/* ---- Friend activity recap ("while you were gone" inbox) ---- */
export interface FriendActivityItem {
  friend_id: string;
  friend_name: string | null;
  friend_avatar: string | null;
  buddy_name: string | null;
  buddy_type: string | null;
  mood_level: number | null;
  sessions_count: number;
  total_seconds: number;
  best_score: number | null;
  last_finished_at: string | null;
  active: boolean;
}

export interface FriendActivityResponse {
  since: string;
  generated_at: string;
  active_count: number;
  idle_count: number;
  items: FriendActivityItem[];
}

/* ---- Notifications ---- */
export interface NotificationPreferences {
  user_id: string;
  push_enabled: boolean;
  email_enabled: boolean;
  friend_session_alerts: boolean;
  inactivity_reminders: boolean;
  buddy_mood_alerts: boolean;
  nudge_enabled: boolean;
  unsubscribe_token: string | null;
}

/** PUT body accepts any subset of the 6 booleans. */
export type NotificationPreferencesUpdate = Partial<
  Pick<
    NotificationPreferences,
    | "push_enabled"
    | "email_enabled"
    | "friend_session_alerts"
    | "inactivity_reminders"
    | "buddy_mood_alerts"
    | "nudge_enabled"
  >
>;

/* ---- Users / profile ---- */
export interface ProfileResponse {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  invite_code: string;
  created_at: string;
  last_active_at: string;
}

export interface ProfileUpdate {
  display_name?: string;
  avatar_url?: string;
}

/* ---- Friend profile (consolidated public view; redacted — no email/invite) ---- */
export interface FriendProfileResponse {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  last_active_at: string;
  buddy: BuddyResponse | null;
  sessions: SessionResponse[];
}

/* ---- Auth ---- */
export interface AuthMeResponse {
  id: string;
  email: string;
  name: string;
  avatar: string;
  authenticated: true;
}
