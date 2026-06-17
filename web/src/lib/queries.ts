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
  GlobalLeaderboardResponse,
  LeaderboardPeriod,
  FriendResponse,
  FriendRequestBody,
  FriendActionBody,
  FriendActivityResponse,
  NotificationPreferences,
  NotificationPreferencesUpdate,
  ProfileResponse,
  ProfileUpdate,
  AuthMeResponse,
  FriendProfileResponse,
  RoomResponse,
  RoomJoinBody,
  RoomHeartbeatBody,
} from "./types";

/* ---- Query keys (stable, centralized) ---- */
export const qk = {
  activeSession: ["session", "active"] as const,
  history: (limit: number, offset: number) => ["session", "history", limit, offset] as const,
  buddy: ["buddy", "me"] as const,
  friendBuddy: (friendId: string) => ["buddy", "friend", friendId] as const,
  leaderboard: (period: LeaderboardPeriod) => ["leaderboard", period] as const,
  globalLeaderboard: (period: LeaderboardPeriod) => ["leaderboard", "global", period] as const,
  friends: ["friends", "list"] as const,
  friendsPending: ["friends", "pending"] as const,
  friendsSent: ["friends", "sent"] as const,
  friendsActivity: (since: string) => ["friends", "activity", since] as const,
  notificationPrefs: ["notifications", "preferences"] as const,
  me: ["users", "me"] as const,
  userOverview: (userId: string) => ["users", "overview", userId] as const,
  authMe: ["auth", "me"] as const,
  activeRoom: ["rooms", "active"] as const,
  room: (id: string) => ["rooms", id] as const,
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

/** DELETE /sessions/{id} — discard an in-progress session (no score/streak). */
export function useCancelSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: boolean }>(`/sessions/${id}`),
    onSuccess: () => {
      qc.setQueryData(qk.activeSession, null);
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

/** GET /leaderboard/global/{period} → GlobalLeaderboardResponse (top 50, all users). */
export function useGlobalLeaderboard(period: LeaderboardPeriod, enabled = true) {
  return useQuery({
    queryKey: qk.globalLeaderboard(period),
    queryFn: ({ signal }) =>
      api.get<GlobalLeaderboardResponse>(`/leaderboard/global/${period}`, { signal }),
    enabled,
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

/** GET /friends/sent → FriendResponse[] (outgoing requests still pending). */
export function useSentRequests() {
  return useQuery({
    queryKey: qk.friendsSent,
    queryFn: ({ signal }) => api.get<FriendResponse[]>("/friends/sent", { signal }),
  });
}

/**
 * GET /friends/activity?since=ISO → FriendActivityResponse. Powers the "while
 * you were gone" recap. `since` is part of the key so a new window refetches.
 * Pass enabled:false until you've resolved the last-seen timestamp.
 */
export function useFriendsActivity(
  since: string,
  options?: Partial<UseQueryOptions<FriendActivityResponse>>
) {
  return useQuery({
    queryKey: qk.friendsActivity(since),
    queryFn: ({ signal }) =>
      api.get<FriendActivityResponse>(
        `/friends/activity?since=${encodeURIComponent(since)}`,
        { signal }
      ),
    staleTime: 60_000,
    ...options,
  });
}

/** POST /friends/request {invite_code?|email?|user_id?} → FriendResponse (idempotent). */
export function useSendFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: FriendRequestBody) => api.post<FriendResponse>("/friends/request", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.friends });
      qc.invalidateQueries({ queryKey: qk.friendsPending });
      qc.invalidateQueries({ queryKey: qk.friendsSent });
      // Global board shows per-row friend status → refresh it too.
      qc.invalidateQueries({ queryKey: ["leaderboard", "global"] });
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
      qc.invalidateQueries({ queryKey: qk.friendsSent });
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
      qc.invalidateQueries({ queryKey: qk.friendsSent });
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

/**
 * GET /users/{userId}/overview → FriendProfileResponse (self or an accepted
 * friend; 404 otherwise). Powers the friend-profile screen in one round-trip.
 */
export function useUserOverview(userId: string | undefined) {
  return useQuery({
    queryKey: qk.userOverview(userId ?? ""),
    queryFn: ({ signal }) =>
      api.get<FriendProfileResponse>(`/users/${userId}/overview`, { signal }),
    enabled: !!userId,
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

/* =====================================================================
   Rooms (Lock In Together)
   ===================================================================== */

/** GET /rooms/active/me → RoomResponse | null. Fails safe (null) pre-migration. */
export function useActiveRoom(options?: Partial<UseQueryOptions<RoomResponse | null>>) {
  return useQuery({
    queryKey: qk.activeRoom,
    queryFn: ({ signal }) => api.get<RoomResponse | null>("/rooms/active/me", { signal }),
    refetchInterval: 20_000,
    ...options,
  });
}

/** GET /rooms/{id} → RoomResponse. Polls while in the room. */
export function useRoom(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: qk.room(id ?? ""),
    queryFn: ({ signal }) => api.get<RoomResponse>(`/rooms/${id}`, { signal }),
    enabled: !!id && enabled,
    refetchInterval: 10_000,
  });
}

/** POST /rooms/ → RoomResponse (open a room you host). */
export function useCreateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<RoomResponse>("/rooms/"),
    onSuccess: (room) => {
      qc.setQueryData(qk.activeRoom, room);
      qc.setQueryData(qk.room(room.id), room);
    },
  });
}

/** POST /rooms/join {code} → RoomResponse. */
export function useJoinRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RoomJoinBody) => api.post<RoomResponse>("/rooms/join", body),
    onSuccess: (room) => {
      qc.setQueryData(qk.activeRoom, room);
      qc.setQueryData(qk.room(room.id), room);
    },
  });
}

/** POST /rooms/{id}/leave. */
export function useLeaveRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<{ ok: boolean }>(`/rooms/${id}/leave`),
    onSuccess: () => {
      qc.setQueryData(qk.activeRoom, null);
    },
  });
}

/** POST /rooms/{id}/heartbeat — keep-alive + report focus progress. */
export function useRoomHeartbeat() {
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: RoomHeartbeatBody }) =>
      api.post<{ ok: boolean }>(`/rooms/${id}/heartbeat`, body),
  });
}
