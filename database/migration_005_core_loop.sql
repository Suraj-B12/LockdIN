-- ============================================
-- Migration 005: Core-loop hardening
-- Run this in Supabase SQL Editor (idempotent — safe to re-run).
--
-- Adds ONLY the new columns introduced by the core-loop work on top of an
-- existing DB that already has schema.sql + migration_004 applied:
--   1. notification_preferences.unsubscribe_token  — gates public unsubscribe
--   2. ai_scores.breakdown (JSONB)                 — algorithm factor breakdown
-- ============================================

-- 1. Per-user unsubscribe token (defaults to a random UUID for existing rows).
ALTER TABLE public.notification_preferences
    ADD COLUMN IF NOT EXISTS unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid();

-- 2. AI score breakdown (nullable — older rows simply have NULL).
ALTER TABLE public.ai_scores
    ADD COLUMN IF NOT EXISTS breakdown JSONB;
