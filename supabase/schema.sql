-- ============================================================
-- BALLOT.IO - COMPLETE SUPABASE DATABASE SCHEMA
-- PostgreSQL 15+ with Row Level Security (RLS) & Realtime
-- ============================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE: profiles (Linked to Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name          VARCHAR(120) NOT NULL,
    email         VARCHAR(254) NOT NULL,
    role          VARCHAR(20) NOT NULL DEFAULT 'voter' CHECK (role IN ('voter', 'admin')),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role  ON public.profiles(role);

-- ============================================================
-- TABLE: polls
-- ============================================================
CREATE TABLE IF NOT EXISTS public.polls (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title        VARCHAR(120) NOT NULL,
    description  VARCHAR(500),
    category     VARCHAR(20) NOT NULL CHECK (category IN ('General', 'Election', 'Community', 'Corporate')),
    status       VARCHAR(20) NOT NULL DEFAULT 'Upcoming' CHECK (status IN ('Upcoming', 'Live', 'Closed')),
    start_date   TIMESTAMPTZ NOT NULL,
    end_date     TIMESTAMPTZ NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_dates CHECK (end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_polls_status     ON public.polls(status);
CREATE INDEX IF NOT EXISTS idx_polls_category   ON public.polls(category);
CREATE INDEX IF NOT EXISTS idx_polls_creator    ON public.polls(creator_id);
CREATE INDEX IF NOT EXISTS idx_polls_start_date ON public.polls(start_date);
CREATE INDEX IF NOT EXISTS idx_polls_end_date   ON public.polls(end_date);

-- ============================================================
-- TABLE: poll_options
-- ============================================================
CREATE TABLE IF NOT EXISTS public.poll_options (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id     UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
    option_text VARCHAR(100) NOT NULL,
    position    SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 8),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (poll_id, position),
    UNIQUE (poll_id, option_text)
);

CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON public.poll_options(poll_id);

-- ============================================================
-- TABLE: votes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.votes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id     UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
    option_id   UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cast_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (poll_id, user_id)  -- Strict 1-vote-per-user-per-poll database guarantee
);

CREATE INDEX IF NOT EXISTS idx_votes_poll_id   ON public.votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_votes_option_id ON public.votes(option_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id   ON public.votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_cast_at   ON public.votes(cast_at);

-- ============================================================
-- TABLE: audit_log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action       VARCHAR(50) NOT NULL,
    entity_type  VARCHAR(50) NOT NULL,
    entity_id    UUID,
    entity_label VARCHAR(200),
    metadata     JSONB,
    occurred_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor      ON public.audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action     ON public.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity     ON public.audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_occurred   ON public.audit_log(occurred_at DESC);

-- ============================================================
-- HELPER FUNCTIONS & TRIGGERS
-- ============================================================

-- Function: update timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_polls_updated_at ON public.polls;
CREATE TRIGGER trg_polls_updated_at
    BEFORE UPDATE ON public.polls
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Function: Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = p_user_id AND role = 'admin' AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Auto-create profile on auth.users sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role VARCHAR(20) := 'voter';
BEGIN
    -- If registering with admin email or metadata specifies admin
    IF NEW.email = 'admin@ballot.io' OR (NEW.raw_user_meta_data->>'role') = 'admin' THEN
        default_role := 'admin';
    END IF;

    INSERT INTO public.profiles (id, name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        default_role
    )
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        email = EXCLUDED.email;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function: Transition poll statuses (Upcoming -> Live -> Closed)
CREATE OR REPLACE FUNCTION public.transition_poll_statuses()
RETURNS INTEGER AS $$
DECLARE
    affected INTEGER := 0;
    count_live INTEGER := 0;
    count_closed INTEGER := 0;
BEGIN
    -- Upcoming -> Live
    UPDATE public.polls
    SET status = 'Live'
    WHERE status = 'Upcoming'
      AND start_date <= NOW()
      AND end_date > NOW();
    GET DIAGNOSTICS count_live = ROW_COUNT;

    -- Live or Upcoming -> Closed
    UPDATE public.polls
    SET status = 'Closed'
    WHERE status IN ('Live', 'Upcoming')
      AND end_date <= NOW();
    GET DIAGNOSTICS count_closed = ROW_COUNT;

    affected := count_live + count_closed;
    RETURN affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RPC: Atomic Vote Casting
-- ============================================================
CREATE OR REPLACE FUNCTION public.cast_vote(p_poll_id UUID, p_option_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_poll RECORD;
    v_option_exists BOOLEAN;
    v_new_vote_id UUID;
BEGIN
    -- 1. Check user authentication
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to cast a vote';
    END IF;

    -- 2. Run status transition first
    PERFORM public.transition_poll_statuses();

    -- 3. Verify poll exists and is Live
    SELECT * INTO v_poll FROM public.polls WHERE id = p_poll_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Poll not found';
    END IF;

    IF v_poll.status <> 'Live' THEN
        RAISE EXCEPTION 'This poll is not currently open for voting (Status: %)', v_poll.status;
    END IF;

    -- 4. Verify option belongs to poll
    SELECT EXISTS (
        SELECT 1 FROM public.poll_options
        WHERE id = p_option_id AND poll_id = p_poll_id
    ) INTO v_option_exists;

    IF NOT v_option_exists THEN
        RAISE EXCEPTION 'Selected option does not belong to this poll';
    END IF;

    -- 5. Verify user hasn't already voted (checked by unique constraint too, but gives explicit message)
    IF EXISTS (SELECT 1 FROM public.votes WHERE poll_id = p_poll_id AND user_id = v_user_id) THEN
        RAISE EXCEPTION 'You have already cast a vote in this poll';
    END IF;

    -- 6. Insert vote record
    INSERT INTO public.votes (poll_id, option_id, user_id)
    VALUES (p_poll_id, p_option_id, v_user_id)
    RETURNING id INTO v_new_vote_id;

    -- 7. Audit log (anonymized vote event)
    INSERT INTO public.audit_log (actor_id, action, entity_type, entity_id, entity_label)
    VALUES (v_user_id, 'CAST_VOTE', 'poll', p_poll_id, v_poll.title);

    RETURN jsonb_build_object(
        'success', true,
        'vote_id', v_new_vote_id,
        'message', 'Vote successfully recorded'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RPC: Poll Results Aggregation
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_poll_results(p_poll_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_total_votes BIGINT := 0;
    v_poll_status VARCHAR(20);
    v_poll_title VARCHAR(120);
    v_results JSONB;
    v_winner_id UUID := NULL;
    v_max_votes BIGINT := 0;
BEGIN
    SELECT title, status INTO v_poll_title, v_poll_status
    FROM public.polls
    WHERE id = p_poll_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Poll not found';
    END IF;

    SELECT COUNT(*) INTO v_total_votes
    FROM public.votes
    WHERE poll_id = p_poll_id;

    SELECT jsonb_agg(
        jsonb_build_object(
            'option_id', po.id,
            'option_text', po.option_text,
            'position', po.position,
            'vote_count', COALESCE(v.vote_count, 0),
            'percentage', CASE 
                WHEN v_total_votes > 0 THEN ROUND((COALESCE(v.vote_count, 0)::NUMERIC / v_total_votes) * 100, 1)
                ELSE 0
            END
        ) ORDER BY po.position
    ) INTO v_results
    FROM public.poll_options po
    LEFT JOIN (
        SELECT option_id, COUNT(*) AS vote_count
        FROM public.votes
        WHERE poll_id = p_poll_id
        GROUP BY option_id
    ) v ON v.option_id = po.id
    WHERE po.poll_id = p_poll_id;

    -- Determine winner if closed or has votes
    IF v_total_votes > 0 THEN
        SELECT po.id, COUNT(v.id) INTO v_winner_id, v_max_votes
        FROM public.poll_options po
        JOIN public.votes v ON v.option_id = po.id
        WHERE po.poll_id = p_poll_id
        GROUP BY po.id
        ORDER BY COUNT(v.id) DESC, po.position ASC
        LIMIT 1;
    END IF;

    RETURN jsonb_build_object(
        'poll_id', p_poll_id,
        'title', v_poll_title,
        'status', v_poll_status,
        'total_votes', v_total_votes,
        'winner_option_id', v_winner_id,
        'options', COALESCE(v_results, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RPC: Admin Dashboard Statistics
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSONB AS $$
DECLARE
    v_total_polls BIGINT;
    v_live_polls BIGINT;
    v_completed_elections BIGINT;
    v_total_votes BIGINT;
    v_total_users BIGINT;
BEGIN
    -- Update statuses first
    PERFORM public.transition_poll_statuses();

    SELECT COUNT(*) INTO v_total_polls FROM public.polls;
    SELECT COUNT(*) INTO v_live_polls FROM public.polls WHERE status = 'Live';
    SELECT COUNT(*) INTO v_completed_elections FROM public.polls WHERE status = 'Closed';
    SELECT COUNT(*) INTO v_total_votes FROM public.votes;
    SELECT COUNT(*) INTO v_total_users FROM public.profiles;

    RETURN jsonb_build_object(
        'total_polls', v_total_polls,
        'live_polls', v_live_polls,
        'completed_elections', v_completed_elections,
        'total_votes', v_total_votes,
        'total_users', v_total_users
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public read profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Polls policies
CREATE POLICY "Anyone can view polls" ON public.polls
    FOR SELECT USING (true);

CREATE POLICY "Admins can create polls" ON public.polls
    FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update polls" ON public.polls
    FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete polls" ON public.polls
    FOR DELETE USING (public.is_admin(auth.uid()));

-- Poll options policies
CREATE POLICY "Anyone can view poll options" ON public.poll_options
    FOR SELECT USING (true);

CREATE POLICY "Admins can insert options" ON public.poll_options
    FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update options" ON public.poll_options
    FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete options" ON public.poll_options
    FOR DELETE USING (public.is_admin(auth.uid()));

-- Votes policies
CREATE POLICY "Users can view own votes" ON public.votes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can cast own vote" ON public.votes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Audit log policies
CREATE POLICY "Admins can view audit log" ON public.audit_log
    FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "System/Users can insert audit logs" ON public.audit_log
    FOR INSERT WITH CHECK (true);

-- ============================================================
-- REALTIME SUBSCRIPTIONS
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'polls'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'votes'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'poll_options'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_options;
    END IF;
END $$;
