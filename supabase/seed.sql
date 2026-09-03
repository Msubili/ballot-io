-- ============================================================
-- BALLOT.IO - SAMPLE SEED DATA FOR SUPABASE
-- Run in Supabase SQL Editor after running schema.sql
-- ============================================================

DO $$
DECLARE
    poll1_id UUID := gen_random_uuid();
    poll2_id UUID := gen_random_uuid();
    poll3_id UUID := gen_random_uuid();
    poll4_id UUID := gen_random_uuid();
BEGIN
    -- 1. Live Election Poll: Student Union Presidential Election
    INSERT INTO public.polls (id, title, description, category, status, start_date, end_date)
    VALUES (
        poll1_id,
        'Student Union Presidential Election 2026',
        'Cast your vote for the 2026/2027 Student Union President. Each student is entitled to exactly one ballot.',
        'Election',
        'Live',
        NOW() - INTERVAL '1 day',
        NOW() + INTERVAL '5 days'
    );

    INSERT INTO public.poll_options (poll_id, option_text, position) VALUES
        (poll1_id, 'Sarah Jenkins (Progressive Student Coalition)', 1),
        (poll1_id, 'David Kim (Campus Action Party)', 2),
        (poll1_id, 'Amina Mohamed (Independent Voice)', 3),
        (poll1_id, 'Liam O''Connor (Student Welfare Alliance)', 4);

    -- 2. Live Community Poll: Community Center Weekend Activities
    INSERT INTO public.polls (id, title, description, category, status, start_date, end_date)
    VALUES (
        poll2_id,
        'Community Center Workshop Topic',
        'Choose the main workshop track for our upcoming open community weekend.',
        'Community',
        'Live',
        NOW() - INTERVAL '2 days',
        NOW() + INTERVAL '3 days'
    );

    INSERT INTO public.poll_options (poll_id, option_text, position) VALUES
        (poll2_id, 'Digital Literacy & Online Safety', 1),
        (poll2_id, 'Sustainable Urban Gardening', 2),
        (poll2_id, 'Youth Entrepreneurship & Coding Basics', 3);

    -- 3. Upcoming Corporate Poll: Q4 Hybrid Work Policy Feedback
    INSERT INTO public.polls (id, title, description, category, status, start_date, end_date)
    VALUES (
        poll3_id,
        '2027 Hybrid Work Model Preference',
        'Help executive leadership finalize the remote-office schedule for the coming fiscal year.',
        'Corporate',
        'Upcoming',
        NOW() + INTERVAL '2 days',
        NOW() + INTERVAL '14 days'
    );

    INSERT INTO public.poll_options (poll_id, option_text, position) VALUES
        (poll3_id, '2 Days Office / 3 Days Remote', 1),
        (poll3_id, '3 Days Office / 2 Days Remote', 2),
        (poll3_id, 'Fully Flexible / Employee Choice', 3);

    -- 4. Closed General Poll: Annual Hackathon Theme
    INSERT INTO public.polls (id, title, description, category, status, start_date, end_date)
    VALUES (
        poll4_id,
        'Annual Tech Hackathon Theme',
        'Voting has concluded. Thank you to everyone who submitted their choice!',
        'General',
        'Closed',
        NOW() - INTERVAL '10 days',
        NOW() - INTERVAL '1 day'
    );

    INSERT INTO public.poll_options (poll_id, option_text, position) VALUES
        (poll4_id, 'AI for Social Good', 1),
        (poll4_id, 'Fintech & Financial Inclusion', 2),
        (poll4_id, 'Climate & Clean Energy Tech', 3);

END $$;
