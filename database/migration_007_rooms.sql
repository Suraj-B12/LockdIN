-- ============================================
-- Migration 007: Lock In Together (live co-focus rooms)
-- Run this in Supabase SQL Editor (idempotent — safe to re-run).
--
-- Adds poll-based co-focus rooms: a host opens a room, friends join by code, and
-- everyone sees who's "locked in now" + a combined focus tally (body-doubling,
-- no video, no websockets — presence is derived from a polled `last_seen`).
-- The /api/rooms endpoints assume these tables; the rest of the app is
-- unaffected if this hasn't been run yet (GET /api/rooms/active fails safe).
-- ============================================

CREATE TABLE IF NOT EXISTS public.rooms (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        TEXT NOT NULL UNIQUE,
    host_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'active', 'closed')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.room_participants (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id       UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status        TEXT NOT NULL DEFAULT 'joined' CHECK (status IN ('joined', 'focusing', 'done', 'left')),
    focus_seconds INTEGER NOT NULL DEFAULT 0,
    joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_rooms_code ON public.rooms(code);
CREATE INDEX IF NOT EXISTS idx_room_participants_room ON public.room_participants(room_id);

-- RLS on (the backend uses the service-role key which bypasses it; we authorize
-- in application code, mirroring every other table). Blocks direct client access.
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;
