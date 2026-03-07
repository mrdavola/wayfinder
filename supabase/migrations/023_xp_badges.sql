-- 023_xp_badges.sql
-- Explorer Points (XP), Badges, Landmarks, and Interactive Stage support
-- Run this in Supabase SQL Editor

-- ============================================================
-- XP EVENTS — tracks every EP-earning action
-- ============================================================
CREATE TABLE IF NOT EXISTS xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'stage_complete', 'quality_bonus', 'challenger_response',
    'reflection', 'peer_help', 'project_complete', 'streak_bonus'
  )),
  points INTEGER NOT NULL DEFAULT 0,
  quest_id UUID REFERENCES quests(id) ON DELETE SET NULL,
  stage_id UUID REFERENCES quest_stages(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_xp_events_student ON xp_events(student_id);
CREATE INDEX IF NOT EXISTS idx_xp_events_student_created ON xp_events(student_id, created_at);

-- ============================================================
-- STUDENT XP SUMMARY — cached totals for fast reads
-- ============================================================
CREATE TABLE IF NOT EXISTS student_xp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE UNIQUE,
  total_points INTEGER DEFAULT 0,
  current_rank TEXT DEFAULT 'apprentice' CHECK (current_rank IN (
    'apprentice', 'scout', 'pathfinder', 'trailblazer', 'navigator', 'expedition_leader'
  )),
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_active_date DATE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_xp_student ON student_xp(student_id);

-- ============================================================
-- BADGE DEFINITIONS — master catalog
-- ============================================================
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT DEFAULT '',
  category TEXT DEFAULT 'achievement' CHECK (category IN ('achievement', 'milestone', 'streak', 'social')),
  criteria JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed badges
INSERT INTO badges (slug, name, description, icon, category, criteria, sort_order) VALUES
  ('first_expedition', 'First Expedition', 'Complete your first project', 'compass', 'milestone', '{"type": "project_complete", "count": 1}', 1),
  ('deep_diver', 'Deep Diver', 'Write 5 or more reflections', 'anchor', 'achievement', '{"type": "reflection_count", "count": 5}', 2),
  ('devils_advocate', 'Devil''s Advocate', 'Respond to 10 challenges', 'flame', 'achievement', '{"type": "challenger_response", "count": 10}', 3),
  ('cartographer', 'Cartographer', 'Help map a peer''s journey', 'map', 'social', '{"type": "peer_help", "count": 1}', 4),
  ('streak_explorer', 'Streak Explorer', 'Maintain a 7-day activity streak', 'zap', 'streak', '{"type": "streak", "days": 7}', 5),
  ('trailblazer', 'Trailblazer', 'Reach the Trailblazer rank', 'mountain', 'milestone', '{"type": "rank_reached", "rank": "trailblazer"}', 6),
  ('navigator', 'Navigator', 'Reach the Navigator rank', 'telescope', 'milestone', '{"type": "rank_reached", "rank": "navigator"}', 7),
  ('stage_master', 'Stage Master', 'Complete 25 stages across all projects', 'flag', 'achievement', '{"type": "stage_complete", "count": 25}', 8),
  ('wordsmith', 'Wordsmith', 'Submit 10 written works', 'pen-tool', 'achievement', '{"type": "text_submission", "count": 10}', 9),
  ('expedition_leader', 'Expedition Leader', 'Reach the highest rank', 'crown', 'milestone', '{"type": "rank_reached", "rank": "expedition_leader"}', 10)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- STUDENT BADGES — earned badges per student
-- ============================================================
CREATE TABLE IF NOT EXISTS student_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (student_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_student_badges_student ON student_badges(student_id);

-- ============================================================
-- MAP LANDMARKS — AI-generated landmarks per quest stage
-- ============================================================
CREATE TABLE IF NOT EXISTS stage_landmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES quest_stages(id) ON DELETE CASCADE UNIQUE,
  landmark_type TEXT NOT NULL CHECK (landmark_type IN (
    'cave', 'lighthouse', 'bridge', 'volcano', 'camp', 'observatory',
    'waterfall', 'ruins', 'tower', 'harbor', 'forest', 'mountain_peak'
  )),
  landmark_name TEXT NOT NULL,
  narrative_hook TEXT,
  ambient_sound TEXT CHECK (ambient_sound IN (
    'campfire', 'ocean', 'wind', 'rain', 'birds', 'cave_drip', 'river', NULL
  )),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- STAGE TYPE EXTENSION — support new interactive types
-- ============================================================
ALTER TABLE quest_stages
  DROP CONSTRAINT IF EXISTS quest_stages_stage_type_check;

ALTER TABLE quest_stages
  ADD CONSTRAINT quest_stages_stage_type_check
  CHECK (stage_type IN (
    'research', 'build', 'experiment', 'simulate', 'reflect', 'present',
    'puzzle_gate', 'choice_fork', 'evidence_board'
  ));

-- ============================================================
-- PUZZLE DATA — stores puzzle/evidence/choice data per stage
-- ============================================================
CREATE TABLE IF NOT EXISTS stage_interactive_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES quest_stages(id) ON DELETE CASCADE UNIQUE,
  interactive_type TEXT NOT NULL CHECK (interactive_type IN ('puzzle_gate', 'choice_fork', 'evidence_board')),
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Puzzle Gate config example:
-- { "puzzle_type": "sort", "instruction": "Sort these into categories", "categories": ["Renewable", "Non-Renewable"], "items": [{"text": "Solar", "correct_category": "Renewable"}] }

-- Choice Fork config example:
-- { "prompt": "Which path do you choose?", "choices": [{"label": "Investigate the river", "description": "Follow the water source", "difficulty": "standard"}] }

-- Evidence Board config example:
-- { "prompt": "Build your case", "clue_cards": [{"id": "c1", "type": "fact", "text": "Green roofs reduce runoff by 50-90%", "source": "EPA.gov"}], "board_zones": ["Environmental", "Economic", "Health"] }

-- ============================================================
-- CAMPFIRE CHAT — extend guide_messages for group chat
-- ============================================================
ALTER TABLE guide_messages
  DROP CONSTRAINT IF EXISTS guide_messages_message_type_check;

ALTER TABLE guide_messages
  ADD CONSTRAINT guide_messages_message_type_check
  CHECK (message_type IN ('field_guide', 'devil_advocate', 'ai_feedback', 'campfire_chat'));

-- ============================================================
-- EXPLORER LOG — public activity feed
-- ============================================================
CREATE TABLE IF NOT EXISTS explorer_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'project_complete', 'rank_up', 'badge_earned', 'stage_complete'
  )),
  message TEXT NOT NULL,
  public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_explorer_log_student_created ON explorer_log(student_id, created_at);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- xp_events
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY xp_events_guide_read ON xp_events FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM students WHERE guide_id = auth.uid()));
CREATE POLICY xp_events_anon_insert ON xp_events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY xp_events_anon_read ON xp_events FOR SELECT TO anon USING (true);

-- student_xp
ALTER TABLE student_xp ENABLE ROW LEVEL SECURITY;
CREATE POLICY student_xp_read ON student_xp FOR SELECT TO anon USING (true);
CREATE POLICY student_xp_guide_read ON student_xp FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM students WHERE guide_id = auth.uid()));
CREATE POLICY student_xp_anon_upsert ON student_xp FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY student_xp_anon_update ON student_xp FOR UPDATE TO anon USING (true);

-- badges
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY badges_read ON badges FOR SELECT USING (true);

-- student_badges
ALTER TABLE student_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY student_badges_read ON student_badges FOR SELECT USING (true);
CREATE POLICY student_badges_insert ON student_badges FOR INSERT TO anon WITH CHECK (true);

-- stage_landmarks
ALTER TABLE stage_landmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY stage_landmarks_read ON stage_landmarks FOR SELECT USING (true);
CREATE POLICY stage_landmarks_auth_insert ON stage_landmarks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY stage_landmarks_anon_insert ON stage_landmarks FOR INSERT TO anon WITH CHECK (true);

-- stage_interactive_data
ALTER TABLE stage_interactive_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY stage_interactive_data_read ON stage_interactive_data FOR SELECT USING (true);
CREATE POLICY stage_interactive_data_auth_manage ON stage_interactive_data FOR ALL TO authenticated USING (true);
CREATE POLICY stage_interactive_data_anon_insert ON stage_interactive_data FOR INSERT TO anon WITH CHECK (true);

-- explorer_log
ALTER TABLE explorer_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY explorer_log_public_read ON explorer_log FOR SELECT USING (public = true);
CREATE POLICY explorer_log_anon_insert ON explorer_log FOR INSERT TO anon WITH CHECK (true);

-- ============================================================
-- RPC: Award XP and check rank/badges
-- ============================================================
CREATE OR REPLACE FUNCTION award_xp(
  p_student_id UUID,
  p_event_type TEXT,
  p_points INTEGER,
  p_quest_id UUID DEFAULT NULL,
  p_stage_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
  v_total INTEGER;
  v_old_rank TEXT;
  v_new_rank TEXT;
  v_streak INTEGER;
BEGIN
  -- Insert XP event
  INSERT INTO xp_events (student_id, event_type, points, quest_id, stage_id, metadata)
  VALUES (p_student_id, p_event_type, p_points, p_quest_id, p_stage_id, p_metadata);

  -- Upsert student_xp summary
  INSERT INTO student_xp (student_id, total_points, last_active_date)
  VALUES (p_student_id, p_points, CURRENT_DATE)
  ON CONFLICT (student_id) DO UPDATE SET
    total_points = student_xp.total_points + p_points,
    last_active_date = CURRENT_DATE,
    updated_at = now();

  -- Get current total and old rank
  SELECT total_points, current_rank INTO v_total, v_old_rank
  FROM student_xp WHERE student_id = p_student_id;

  -- Calculate new rank
  v_new_rank := CASE
    WHEN v_total >= 6000 THEN 'expedition_leader'
    WHEN v_total >= 3000 THEN 'navigator'
    WHEN v_total >= 1500 THEN 'trailblazer'
    WHEN v_total >= 600 THEN 'pathfinder'
    WHEN v_total >= 200 THEN 'scout'
    ELSE 'apprentice'
  END;

  -- Update rank if changed
  IF v_new_rank != v_old_rank THEN
    UPDATE student_xp SET current_rank = v_new_rank WHERE student_id = p_student_id;
  END IF;

  -- Update streak
  UPDATE student_xp SET
    current_streak = CASE
      WHEN last_active_date = CURRENT_DATE - INTERVAL '1 day' THEN current_streak + 1
      WHEN last_active_date = CURRENT_DATE THEN current_streak
      ELSE 1
    END,
    longest_streak = GREATEST(longest_streak, current_streak)
  WHERE student_id = p_student_id;

  SELECT current_streak INTO v_streak FROM student_xp WHERE student_id = p_student_id;

  RETURN jsonb_build_object(
    'total_points', v_total,
    'new_rank', v_new_rank,
    'rank_changed', v_new_rank != v_old_rank,
    'current_streak', v_streak
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
