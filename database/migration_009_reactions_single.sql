-- ============================================
-- Migration 009: Reactions become SINGLE-select
-- Run this in Supabase SQL Editor (idempotent — safe to re-run).
--
-- A user may now hold at most ONE reaction per friend session. Tapping a
-- different emoji REPLACES the prior one; tapping the active emoji removes it.
-- This swaps the uniqueness from (actor, session, emoji) to (actor, session)
-- and collapses any pre-existing multi-reactions to the most recent one.
-- ============================================

-- 1. Collapse existing multi-reactions: keep only the most recent row per
--    (actor, session); delete the rest. (No-op once single-select holds.)
DELETE FROM public.reactions r
USING public.reactions r2
WHERE r.actor_id = r2.actor_id
  AND r.target_session_id = r2.target_session_id
  AND (
        r.created_at < r2.created_at
        OR (r.created_at = r2.created_at AND r.id < r2.id)
      );

-- 2. Drop the old (actor, session, emoji) uniqueness. The constraint Postgres
--    auto-named when migration_008 declared `UNIQUE (actor_id, target_session_id, emoji)`.
ALTER TABLE public.reactions
  DROP CONSTRAINT IF EXISTS reactions_actor_id_target_session_id_emoji_key;

-- 3. Add the new (actor, session) uniqueness if it isn't already there.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reactions_one_per_session'
  ) THEN
    ALTER TABLE public.reactions
      ADD CONSTRAINT reactions_one_per_session UNIQUE (actor_id, target_session_id);
  END IF;
END $$;
