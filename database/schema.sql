-- ============================================
-- LockdIN Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========== USERS ==========
-- Extends Supabase Auth users with app-specific data
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL DEFAULT 'New User',
    avatar_url TEXT,
    invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== SESSIONS ==========
-- Timed focus sessions (start/pause/resume/finish)
CREATE TABLE public.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paused_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    total_seconds INTEGER NOT NULL DEFAULT 0,
    pause_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'finished')),
    work_log TEXT,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_sessions_date ON public.sessions(session_date);
CREATE INDEX idx_sessions_status ON public.sessions(status);

-- ========== AI SCORES ==========
-- AI-generated scores for completed sessions
CREATE TABLE public.ai_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID UNIQUE NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    summary TEXT,
    model_used TEXT NOT NULL DEFAULT 'mistral',
    scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== STREAKS ==========
-- Daily tracking for calendar heatmaps
CREATE TABLE public.streaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    streak_date DATE NOT NULL DEFAULT CURRENT_DATE,
    daily_seconds INTEGER NOT NULL DEFAULT 0,
    daily_score INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(user_id, streak_date)
);

CREATE INDEX idx_streaks_user_date ON public.streaks(user_id, streak_date);

-- ========== BUDDIES ==========
-- Virtual accountability buddy (1 per user)
CREATE TABLE public.buddies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    buddy_type TEXT NOT NULL DEFAULT 'cat',
    buddy_name TEXT NOT NULL DEFAULT 'Buddy',
    mood_level INTEGER NOT NULL DEFAULT 1 CHECK (mood_level >= 1 AND mood_level <= 10),
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_session_date DATE
);

-- ========== FRIENDSHIPS ==========
-- Friend connections between users
CREATE TABLE public.friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, friend_id),
    CHECK (user_id != friend_id)
);

CREATE INDEX idx_friendships_user ON public.friendships(user_id);
CREATE INDEX idx_friendships_friend ON public.friendships(friend_id);

-- ========== ROW LEVEL SECURITY ==========
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all profiles, update only their own
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Sessions: users can manage their own sessions
CREATE POLICY "Users can view own sessions" ON public.sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sessions" ON public.sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.sessions FOR UPDATE USING (auth.uid() = user_id);

-- AI Scores: viewable if you own the session
CREATE POLICY "Users can view own scores" ON public.ai_scores FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = ai_scores.session_id AND sessions.user_id = auth.uid()));

-- Streaks: users can view all (for leaderboard), manage own
CREATE POLICY "Streaks are viewable by everyone" ON public.streaks FOR SELECT USING (true);
CREATE POLICY "Users can manage own streaks" ON public.streaks FOR ALL USING (auth.uid() = user_id);

-- Buddies: viewable by everyone (friends can see), manage own
CREATE POLICY "Buddies are viewable by everyone" ON public.buddies FOR SELECT USING (true);
CREATE POLICY "Users can manage own buddy" ON public.buddies FOR ALL USING (auth.uid() = user_id);

-- Friendships: users can see their own friendships
CREATE POLICY "Users can view own friendships" ON public.friendships FOR SELECT
    USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Users can create friendships" ON public.friendships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own friendships" ON public.friendships FOR UPDATE
    USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- ========== AUTO-CREATE PROFILE ON SIGNUP ==========
-- When a new user signs up via Supabase Auth, auto-create their profile + buddy
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'New User'),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL)
    );
    INSERT INTO public.buddies (user_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
