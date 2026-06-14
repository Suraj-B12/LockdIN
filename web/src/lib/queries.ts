/* =====================================================================
   TanStack Query hooks — typed bindings for the FROZEN API CONTRACT.
   Screen agents: consume these instead of calling api.* directly. Mutations
   invalidate the relevant query keys so the UI stays consistent.
   ===================================================================== */
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { api } from "./api";
import type {
  SessionResponse,
  FinishSessionBody,
  BuddyResponse,
  UpdateBuddyBody,
  LeaderboardResponse,
  LeaderboardPeriod,
  FriendResponse,
  FriendRequestBody,
  FriendActionBody,
  NotificationPreferences,
  NotificationPreferencesUpdate,
  ProfileResponse,
  ProfileUpdate,
  AuthMeResponse,
} from "./types";

/* ---- Query keys (stable, centralized) ---- */
export const qk = {
  activeSession: ["session", "active"] as const,
  history: (limit: number, offset: number) => ["session", "history", limit, offset] as const,
  buddy: ["buddy", "me"] as const,
  friendBuddy: (friendId: string) => ["buddy", "friend", friendId] as const,
  leaderboard: (period: LeaderboardPeriod) => ["leaderboard", period] as const,
  friends: ["friends", "list"] as const,
  friendsPending: ["friends", "pending"] as const,
  notificationPrefs: ["notifications", "preferences"] as const,
  me: ["users", "me"] as const,
  authMe: ["auth", "me"] as const,
};

/* =====================================================================
   Sessions
   ===================================================================== */

/** GET /sessions/active → SessionResponse | null. Polls every 30s. */
export function useActiveSession(
  options?: Partial<UseQueryOptions<SessionResponse | null>>
) {
  return useQuery({
    queryKey: qk.activeSession,
    queryFn: ({ signal }) => api.get<SessionResponse | null>("/sessions/active", { signal }),
    refetchInterval: 30_000,
    ...options,
  });
}

/** GET /sessions/history?limit&offset → SessionResponse[]. */
export function useHistory(limit = 20, offset = 0) {
  return useQuery({
    queryKey: qk.history(limit, offset),
    queryFn: ({ signal }) =>
      api.get<SessionResponse[]>(`/sessions/history?limit=${limit}&offset=${offset}`, { signal }),
  });
}

/** POST /sessions/start → SessionResponse (409 if an active session exists). */
export function useStartSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<SessionResponse>("/sessions/start"),
    onSuccess: (s) => {
      qc.setQueryData(qk.activeSession, s);
    },
  });
}

/** PUT /sessions/{id}/pause → SessionResponse. */
export function usePauseSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.put<SessionResponse>(`/sessions/${id}/pause`),
    onSuccess: (s) => qc.setQueryData(qk.activeSession, s),
  });
}

/** PUT /sessions/{id}/resume → SessionResponse. */
export function useResumeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.put<SessionResponse>(`/sessions/${id}/resume`),
    onSuccess: (s) => qc.setQueryData(qk.activeSession, s),
  });
}

/**
 * PUT /sessions/{id}/finish {work_log} → SessionResponse.
 * ai_score is PROVISIONAL; we invalidate history so the upgraded LLM score
 * is picked up on the next refetch.
 */
export function useFinishSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: FinishSessionBody }) =>
      api.put<SessionResponse>(`/sessions/${id}/finish`, body),
    onSuccess: () => {
      qc.setQueryData(qk.activeSession, null);
      qc.invalidateQueries({ queryKey: ["session", "history"] });
      qc.invalidateQueries({ queryKey: qk.buddy });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}

/* =====================================================================
   Buddy
   ===================================================================== */

/** GET /buddy/ → BuddyResponse. */
export function useBuddy(options?: Partial<UseQueryOptions<BuddyResponse>>) {
  return useQuery({
    queryKey: qk.buddy,
    queryFn: ({ signal }) => api.get<BuddyResponse>("/buddy/", { signal }),
    ...options,
  });
}

/** GET /buddy/friend/{friendId} → BuddyResponse. */
export function useFriendBuddy(friendId: string | undefined) {
  return useQuery({
    queryKey: qk.friendBuddy(friendId ?? ""),
    queryFn: ({ signal }) => api.get<BuddyResponse>(`/buddy/friend/${friendId}`, { signal }),
    enabled: !!friendId,
  });
}

/** PUT /buddy/ {buddy_type?, buddy_name?} → BuddyResponse. */
export function useUpdateBuddy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateBuddyBody) => api.put<BuddyResponse>("/buddy/", body),
    onSuccess: (b) => qc.setQueryData(qk.buddy, b),
  });
}

/* =====================================================================
   Leaderboard
   ===================================================================== */

/** GET /leaderboard/{period} → LeaderboardResponse (top 20). */
export function useLeaderboard(period: LeaderboardPeriod) {
  return useQuery({
    queryKey: qk.leaderboard(period),
    queryFn: ({ signal }) => api.get<LeaderboardResponse>(`/leaderboard/${period}`, { signal }),
  });
}

/* =====================================================================
   Friends
   ===================================================================== */

/** GET /friends/ → FriendResponse[]. */
export function useFriends() {
  return useQuery({
    queryKey: qk.friends,
    queryFn: ({ signal }) => api.get<FriendResponse[]>("/friends/", { signal }),
  });
}

/** GET /friends/pending → FriendResponse[]. */
export function usePendingFriends() {
  return useQuery({
    queryKey: qk.friendsPending,
    queryFn: ({ signal }) => api.get<FriendResponse[]>("/friends/pending", { signal }),
  });
}

/** POST /friends/request {invite_code?|email?} → FriendResponse (idempotent). */
export function useSendFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: FriendRequestBody) => api.post<FriendResponse>("/friends/request", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.friends });
      qc.invalidateQueries({ queryKey: qk.friendsPending });
    },
  });
}

/** PUT /friends/{id} {action} → FriendResponse. */
export function useRespondToFriend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: FriendActionBody }) =>
      api.put<FriendResponse>(`/friends/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.friends });
      qc.invalidateQueries({ queryKey: qk.friendsPending });
    },
  });
}

/** DELETE /friends/{id}. */
export function useRemoveFriend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/friends/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.friends });
      qc.invalidateQueries({ queryKey: qk.friendsPending });
    },
  });
}

/* =====================================================================
   Notifications
   ===================================================================== */

/** GET /notifications/preferences → NotificationPreferences. */
export function useNotificationPrefs() {
  return useQuery({
    queryKey: qk.notificationPrefs,
    queryFn: ({ signal }) =>
      api.get<NotificationPreferences>("/notifications/preferences", { signal }),
  });
}

/** PUT /notifications/preferences (subset of 6 booleans). */
export function useUpdateNotificationPrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NotificationPreferencesUpdate) =>
      api.put<NotificationPreferences>("/notifications/preferences", body),
    onSuccess: (prefs) => qc.setQueryData(qk.notificationPrefs, prefs),
  });
}

/** POST /notifications/nudge/{friendId}. */
export function useNudgeFriend() {
  return useMutation({
    mutationFn: (friendId: string) => api.post<void>(`/notifications/nudge/${friendId}`),
  });
}

/* =====================================================================
   Profile / auth
   ===================================================================== */

/** GET /users/me → ProfileResponse. */
export function useProfile(options?: Partial<UseQueryOptions<ProfileResponse>>) {
  return useQuery({
    queryKey: qk.me,
    queryFn: ({ signal }) => api.get<ProfileResponse>("/users/me", { signal }),
    ...options,
  });
}

/** PUT /users/me {display_name?, avatar_url?} → ProfileResponse. */
export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProfileUpdate) => api.put<ProfileResponse>("/users/me", body),
    onSuccess: (p) => qc.setQueryData(qk.me, p),
  });
}

/** GET /auth/me → AuthMeResponse. */
export function useAuthMe() {
  return useQuery({
    queryKey: qk.authMe,
    queryFn: ({ signal }) => api.get<AuthMeResponse>("/auth/me", { signal }),
  });
}
