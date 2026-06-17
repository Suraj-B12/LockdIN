-- ============================================
-- Migration 008: Reactions (give-only positive emoji on friends' sessions)
-- Run this in Supabase SQL Editor (idempotent — safe to re-run).
--
-- Friends can react to each other's finished sessions with a fixed set of
-- positive emoji (no downvotes, no read-receipts). One row per
-- (actor, session, emoji) so a tap toggles idempotently. The /api/reactions
-- batch endpoint fails safe (returns {}) if this hasn't been run yet, so the
-- session feed renders normally before the migration.
-- ============================================

CREATE TABLE IF NOT EXISTS public.reactions (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_session_id  UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    emoji              TEXT NOT NULL CHECK (emoji IN ('fire', 'clap', 'muscle', 'eyes', 'brain', 'hundred')),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (actor_id, target_session_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_reactions_session ON public.reactions(target_session_id);

-- RLS on (service-role bypasses it; the app authorizes in code).
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
