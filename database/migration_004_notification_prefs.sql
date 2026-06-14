-- ============================================
-- Migration 004: Notification Preferences table
-- Run this in Supabase SQL Editor after applying schema.sql
-- ============================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    friend_session_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    inactivity_reminders BOOLEAN NOT NULL DEFAULT TRUE,
    buddy_mood_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    nudge_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification prefs"
    ON public.notification_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own notification prefs"
    ON public.notification_preferences FOR ALL
    USING (auth.uid() = user_id);

-- Auto-create default prefs row when a new user signs up
-- (Extends the existing handle_new_user() trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'New User'),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL)
    );
    INSERT INTO public.buddies (user_id) VALUES (NEW.id);
    -- Auto-create notification preferences with defaults
    INSERT INTO public.notification_preferences (user_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Index for fast lookup by user_id
CREATE INDEX IF NOT EXISTS idx_notif_prefs_user ON public.notification_preferences(user_id);
