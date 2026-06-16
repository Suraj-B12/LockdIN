-- ============================================
-- Migration 006: Humane streak (streak freeze)
-- Run this in Supabase SQL Editor (idempotent — safe to re-run).
--
-- Adds the columns that power "streak freeze" — a missed day no longer zeroes a
-- streak if the user has a freeze to spend. The backend DEGRADES GRACEFULLY if
-- this migration hasn't been run yet (freezes simply read as unavailable), so
-- deploying the code before running this never breaks anything.
--
--   1. buddies.streak_freezes  — how many auto-applied freezes the user has (cap 2)
--   2. streaks.frozen          — marks a day that was bridged by a freeze (no real
--                                session) so the UI can show it differently
--   3. profiles.timezone       — per-user IANA tz for an accurate streak day
--                                boundary (forward-looking; defaults to UTC)
-- ============================================

-- 1. Streak freezes — existing users start with the standard allotment of 2.
ALTER TABLE public.buddies
    ADD COLUMN IF NOT EXISTS streak_freezes INTEGER NOT NULL DEFAULT 2;

-- 2. Frozen-day marker (a day kept alive by a freeze, not a real session).
ALTER TABLE public.streaks
    ADD COLUMN IF NOT EXISTS frozen BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Per-user timezone (IANA name, e.g. "Asia/Kolkata"); defaults to UTC.
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';
