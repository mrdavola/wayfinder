-- SAFE IDEMPOTENT VERSION: All CREATE TABLE/INDEX/POLICY are IF NOT EXISTS or wrapped
-- Run this in Supabase SQL Editor

-- ===================== GUIDE MESSAGES =====================
-- Persists Field Guide chat, Devil's Advocate, and AI feedback messages

CREATE TABLE IF NOT EXISTS public.guide_messages (
  id uuid default gen_random_uuid() primary key,
  quest_id uuid references public.quests(id) on delete cascade not null,
  stage_id uuid references public.quest_stages(id) on delete cascade,
  student_id uuid references public.students(id) on delete set null,
  student_name text not null,
  role text not null check (role in ('user', 'assistant', 'challenger')),
  content text not null,
  message_type text default 'field_guide' check (message_type in ('field_guide', 'devil_advocate', 'ai_feedback')),
  created_at timestamptz default now()
);

alter table public.guide_messages enable row level security;

-- Guides can read messages for their quests
DO $pol$ BEGIN
  create policy "Guides can read guide messages" on public.guide_messages
  for select using (
    exists (
      select 1 from public.quests q where q.id = quest_id and q.guide_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;

-- Anon can insert (students are unauthenticated)
DO $pol$ BEGIN
  create policy "Anon can insert guide messages" on public.guide_messages
  for insert with check (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS guide_messages_quest_stage_idx on public.guide_messages(quest_id, stage_id, student_name);

-- RPC for anon student reads
create or replace function public.get_guide_messages(p_quest_id uuid, p_stage_id uuid, p_student_name text)
returns setof public.guide_messages
language sql security definer
as $$
  select * from public.guide_messages
  where quest_id = p_quest_id
    and stage_id = p_stage_id
    and student_name = p_student_name
  order by created_at asc;
$$;
-- ===================== SUBMISSION FEEDBACK =====================
-- AI-generated feedback on student work submissions

CREATE TABLE IF NOT EXISTS public.submission_feedback (
  id uuid default gen_random_uuid() primary key,
  submission_id uuid,
  quest_id uuid references public.quests(id) on delete cascade not null,
  stage_id uuid references public.quest_stages(id) on delete cascade,
  student_name text not null,
  feedback_text text not null,
  skills_demonstrated text[] default '{}',
  encouragement text,
  next_steps text,
  created_at timestamptz default now()
);

alter table public.submission_feedback enable row level security;

-- Guides can read feedback for their quests
DO $pol$ BEGIN
  create policy "Guides can read submission feedback" on public.submission_feedback
  for select using (
    exists (
      select 1 from public.quests q where q.id = quest_id and q.guide_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;

-- Anon can insert (students are unauthenticated)
DO $pol$ BEGIN
  create policy "Anon can insert submission feedback" on public.submission_feedback
  for insert with check (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;

-- Index
CREATE INDEX IF NOT EXISTS submission_feedback_quest_idx on public.submission_feedback(quest_id, student_name);

-- RPC for anon student reads
create or replace function public.get_submission_feedback(p_quest_id uuid, p_student_name text)
returns setof public.submission_feedback
language sql security definer
as $$
  select * from public.submission_feedback
  where quest_id = p_quest_id
    and student_name = p_student_name
  order by created_at asc;
$$;
-- ===================== PARENT ENRICHMENT =====================
-- Enrich parent_access with onboarding data and dashboard RPCs

-- Add columns (idempotent via IF NOT EXISTS)
DO $$ BEGIN
  ALTER TABLE public.parent_access ADD COLUMN IF NOT EXISTS parent_name text;
  ALTER TABLE public.parent_access ADD COLUMN IF NOT EXISTS relationship text;
  ALTER TABLE public.parent_access ADD COLUMN IF NOT EXISTS expectations text;
  ALTER TABLE public.parent_access ADD COLUMN IF NOT EXISTS child_loves text;
  ALTER TABLE public.parent_access ADD COLUMN IF NOT EXISTS core_skill_priorities text[] DEFAULT '{}';
  ALTER TABLE public.parent_access ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;
  ALTER TABLE public.parent_access ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{}';
EXCEPTION WHEN undefined_table THEN
  -- parent_access doesn't exist yet — create it
  CREATE TABLE IF NOT EXISTS public.parent_access (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id uuid REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    parent_email text,
    parent_name text,
    relationship text,
    expectations text,
    child_loves text,
    core_skill_priorities text[] DEFAULT '{}',
    onboarded_at timestamptz,
    notification_preferences jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
  );
  ALTER TABLE public.parent_access ENABLE ROW LEVEL SECURITY;
  DO $pol$ BEGIN
  CREATE POLICY "Guides can manage parent access" ON public.parent_access
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.students s WHERE s.id = student_id AND s.guide_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
  DO $pol$ BEGIN
  CREATE POLICY "Anon can read by token" ON public.parent_access
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
  DO $pol$ BEGIN
  CREATE POLICY "Anon can update by token" ON public.parent_access
    FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
END $$;

-- RPC: Parent onboarding
CREATE OR REPLACE FUNCTION public.parent_onboard(
  p_token text,
  p_name text,
  p_relationship text,
  p_expectations text,
  p_child_loves text,
  p_priorities text[]
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_pa parent_access%ROWTYPE;
BEGIN
  SELECT * INTO v_pa FROM public.parent_access WHERE access_token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid token');
  END IF;

  UPDATE public.parent_access SET
    parent_name = p_name,
    relationship = p_relationship,
    expectations = p_expectations,
    child_loves = p_child_loves,
    core_skill_priorities = COALESCE(p_priorities, '{}'),
    onboarded_at = now()
  WHERE access_token = p_token;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC: Get parent dashboard data
CREATE OR REPLACE FUNCTION public.get_parent_dashboard(p_token text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_pa parent_access%ROWTYPE;
  v_student students%ROWTYPE;
  v_quests jsonb;
  v_skills jsonb;
  v_snapshots jsonb;
BEGIN
  SELECT * INTO v_pa FROM public.parent_access WHERE access_token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invalid token');
  END IF;

  SELECT * INTO v_student FROM public.students WHERE id = v_pa.student_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Student not found');
  END IF;

  -- Active quests with progress
  SELECT COALESCE(jsonb_agg(q), '[]'::jsonb) INTO v_quests
  FROM (
    SELECT
      qu.id, qu.title, qu.subtitle, qu.status, qu.parent_summary, qu.career_pathway,
      (SELECT count(*) FROM quest_stages qs WHERE qs.quest_id = qu.id AND qs.status = 'completed') AS stages_done,
      (SELECT count(*) FROM quest_stages qs WHERE qs.quest_id = qu.id) AS stages_total
    FROM quests qu
    JOIN quest_students qst ON qst.quest_id = qu.id
    WHERE qst.student_id = v_pa.student_id
      AND qu.status IN ('active', 'completed')
    ORDER BY qu.created_at DESC
  ) q;

  -- Current skills
  SELECT COALESCE(jsonb_agg(sk), '[]'::jsonb) INTO v_skills
  FROM (
    SELECT ss.proficiency, s.name AS skill_name, s.category, ss.updated_at
    FROM student_skills ss
    JOIN skills s ON s.id = ss.skill_id
    WHERE ss.student_id = v_pa.student_id
    ORDER BY s.sort_order
  ) sk;

  -- Recent snapshots
  SELECT COALESCE(jsonb_agg(sn), '[]'::jsonb) INTO v_snapshots
  FROM (
    SELECT sks.proficiency, sks.snapshot_at, s.name AS skill_name
    FROM skill_snapshots sks
    JOIN skills s ON s.id = sks.skill_id
    WHERE sks.student_id = v_pa.student_id
    ORDER BY sks.snapshot_at DESC
    LIMIT 20
  ) sn;

  RETURN jsonb_build_object(
    'parent', jsonb_build_object(
      'parent_name', v_pa.parent_name,
      'relationship', v_pa.relationship,
      'expectations', v_pa.expectations,
      'child_loves', v_pa.child_loves,
      'onboarded_at', v_pa.onboarded_at
    ),
    'student', jsonb_build_object(
      'id', v_student.id,
      'name', v_student.name,
      'age', v_student.age,
      'grade_band', v_student.grade_band,
      'avatar_emoji', v_student.avatar_emoji,
      'interests', v_student.interests
    ),
    'quests', v_quests,
    'skills', v_skills,
    'snapshots', v_snapshots
  );
END;
$$;-- ===================== PROGRESSIVE DIFFICULTY =====================
-- Add stretch challenges and difficulty tiers to quest stages

ALTER TABLE public.quest_stages
  ADD COLUMN IF NOT EXISTS stretch_challenge text,
  ADD COLUMN IF NOT EXISTS difficulty_tier text DEFAULT 'standard';

-- Add check constraint if it doesn't exist
DO $$ BEGIN
  ALTER TABLE public.quest_stages
    ADD CONSTRAINT quest_stages_difficulty_tier_check
    CHECK (difficulty_tier IN ('scaffolded', 'standard', 'stretch'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- ═══════════════════════════════════════════════════════════════════════════════
-- 018: Library - Public Templates
-- Adds is_public flag and grade_band to quest_templates for community sharing
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add columns
ALTER TABLE public.quest_templates
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS grade_band TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS author_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS use_count INT DEFAULT 0;

-- Index for community queries
CREATE INDEX IF NOT EXISTS quest_templates_public_idx
  ON public.quest_templates(is_public) WHERE is_public = TRUE;

-- RLS: anyone can read public templates
DO $pol$ BEGIN
  CREATE POLICY "Anyone can read public templates" ON public.quest_templates
  FOR SELECT USING (is_public = TRUE OR guide_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;

-- Allow anon to read public templates (for logged-out browsing)
GRANT SELECT ON public.quest_templates TO anon;
-- ============================================================
-- 018: Per-Learner Standards Profiles
-- Each student gets their own standards (core/recommended/supplementary)
-- sourced from school defaults, parent input, AI, or guide decisions
-- ============================================================

CREATE TABLE IF NOT EXISTS student_standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  standard_code TEXT NOT NULL,
  standard_label TEXT NOT NULL,
  standard_description TEXT NOT NULL,
  subject TEXT,
  grade_band TEXT,
  source TEXT NOT NULL DEFAULT 'school'
    CHECK (source IN ('school','parent','guide','ai')),
  priority TEXT NOT NULL DEFAULT 'core'
    CHECK (priority IN ('core','recommended','supplementary')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','completed','skipped')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, standard_code)
);

CREATE INDEX IF NOT EXISTS idx_student_standards_student ON student_standards(student_id);
CREATE INDEX IF NOT EXISTS idx_student_standards_student_status ON student_standards(student_id, status);

-- RLS policies
ALTER TABLE student_standards ENABLE ROW LEVEL SECURITY;

-- Guides can manage standards for their students
DO $pol$ BEGIN
  CREATE POLICY "Guides manage student standards"
  ON student_standards FOR ALL
  USING (
    student_id IN (
      SELECT id FROM students WHERE guide_id = auth.uid()
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT id FROM students WHERE guide_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;

-- Anon read for student/parent views
DO $pol$ BEGIN
  CREATE POLICY "Anon read student standards"
  ON student_standards FOR SELECT
  USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;

-- Parent standards priorities on parent_access
ALTER TABLE parent_access
  ADD COLUMN IF NOT EXISTS standards_priorities JSONB DEFAULT '{}';
-- ═══════════════════════════════════════════════════════════════════════════════
-- 019: Guide Messages — Flagged Column for Moderation
-- Adds flagged boolean for content safety monitoring
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add flagged column
ALTER TABLE public.guide_messages
  ADD COLUMN IF NOT EXISTS flagged BOOLEAN DEFAULT FALSE;

-- Index for fast flagged lookups
CREATE INDEX IF NOT EXISTS guide_messages_flagged_idx
  ON public.guide_messages(flagged) WHERE flagged = TRUE;

-- Allow guides to update messages (for marking reviewed)
DO $pol$ BEGIN
  CREATE POLICY "Guides can update guide messages" ON public.guide_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.quests q WHERE q.id = quest_id AND q.guide_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;

-- Allow anon to insert flagged field
-- (anon insert policy already exists from 014, this just ensures flagged column is writable)
-- ============================================================
-- 019: AI Project Suggestions & Guide Playbook
-- project_suggestions: AI-generated project ideas for students
-- guide_playbook: day-by-day facilitation plan for quests
-- ============================================================

CREATE TABLE IF NOT EXISTS project_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  standards_addressed TEXT[] DEFAULT '{}',
  career_connection TEXT,
  real_world_problem JSONB DEFAULT '{}',
  estimated_duration_days INTEGER DEFAULT 10,
  difficulty TEXT DEFAULT 'intermediate',
  status TEXT NOT NULL DEFAULT 'suggested'
    CHECK (status IN ('suggested','accepted','dismissed','converted')),
  converted_quest_id UUID REFERENCES quests(id) ON DELETE SET NULL,
  batch_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_suggestions_student ON project_suggestions(student_id);
CREATE INDEX IF NOT EXISTS idx_project_suggestions_student_status ON project_suggestions(student_id, status);
CREATE INDEX IF NOT EXISTS idx_project_suggestions_batch ON project_suggestions(batch_id);

ALTER TABLE project_suggestions ENABLE ROW LEVEL SECURITY;

DO $pol$ BEGIN
  CREATE POLICY "Guides manage their suggestions"
  ON project_suggestions FOR ALL
  USING (guide_id = auth.uid())
  WITH CHECK (guide_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;

DO $pol$ BEGIN
  CREATE POLICY "Anon read suggestions"
  ON project_suggestions FOR SELECT
  USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;

-- ── Guide Playbook ──

CREATE TABLE IF NOT EXISTS guide_playbook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  prep_tasks TEXT[] DEFAULT '{}',
  materials TEXT[] DEFAULT '{}',
  facilitation_notes TEXT DEFAULT '',
  time_blocks JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(quest_id, day_number)
);

CREATE INDEX IF NOT EXISTS idx_guide_playbook_quest ON guide_playbook(quest_id);

ALTER TABLE guide_playbook ENABLE ROW LEVEL SECURITY;

DO $pol$ BEGIN
  CREATE POLICY "Guides manage playbook for their quests"
  ON guide_playbook FOR ALL
  USING (
    quest_id IN (
      SELECT id FROM quests WHERE guide_id = auth.uid()
    )
  )
  WITH CHECK (
    quest_id IN (
      SELECT id FROM quests WHERE guide_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;

DO $pol$ BEGIN
  CREATE POLICY "Anon read playbook"
  ON guide_playbook FOR SELECT
  USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
-- Add allow_ai_guide toggle to students table
-- Controls whether AI Field Guide chatbot is available on student-created projects
ALTER TABLE students ADD COLUMN IF NOT EXISTS allow_ai_guide BOOLEAN DEFAULT TRUE;
-- ============================================================
-- 020: Parent Join RPC
-- Allows anonymous parents to join by entering student PIN
-- ============================================================

CREATE OR REPLACE FUNCTION public.parent_join_by_pin(p_pin text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_student RECORD;
  v_pa RECORD;
BEGIN
  -- Look up student by PIN
  SELECT id, name, age, grade_band, avatar_emoji
  INTO v_student
  FROM public.students
  WHERE pin = p_pin;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No student found with that code.');
  END IF;

  -- Check if parent_access already exists
  SELECT * INTO v_pa
  FROM public.parent_access
  WHERE student_id = v_student.id
  LIMIT 1;

  IF FOUND THEN
    -- Return existing token
    RETURN jsonb_build_object(
      'success', true,
      'token', v_pa.access_token,
      'student_name', v_student.name,
      'is_new', false
    );
  END IF;

  -- Create new parent_access row
  INSERT INTO public.parent_access (student_id, parent_email)
  VALUES (v_student.id, '')
  RETURNING * INTO v_pa;

  RETURN jsonb_build_object(
    'success', true,
    'token', v_pa.access_token,
    'student_name', v_student.name,
    'is_new', true
  );
END;
$$;
-- Buddy pairing: guide-level toggle
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS buddy_pairing_enabled BOOLEAN DEFAULT FALSE;

-- Allow anon to read profiles (for buddy pairing check)
DO $$ BEGIN
  DO $pol$ BEGIN
  CREATE POLICY "Anon can read profiles" ON profiles FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- ============================================================
-- 021: Submission Revision History
-- Keeps previous attempts when students resubmit
-- ============================================================

-- Add revision_history column
ALTER TABLE public.stage_submissions
  ADD COLUMN IF NOT EXISTS revision_history JSONB DEFAULT '[]';

-- Update submit_stage_work to preserve previous attempt
CREATE OR REPLACE FUNCTION public.submit_stage_work(
  p_quest_id       uuid,
  p_stage_id       uuid,
  p_student_name   text,
  p_submission_type text,
  p_content        text DEFAULT NULL,
  p_file_url       text DEFAULT NULL,
  p_file_name      text DEFAULT NULL,
  p_file_size      bigint DEFAULT NULL,
  p_mime_type      text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing RECORD;
  v_history JSONB;
BEGIN
  -- Check if there's an existing submission to archive
  SELECT * INTO v_existing
  FROM public.stage_submissions
  WHERE stage_id = p_stage_id AND student_name = p_student_name;

  IF FOUND THEN
    -- Build history entry from existing submission
    v_history := COALESCE(v_existing.revision_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'submission_type', v_existing.submission_type,
      'content', v_existing.content,
      'file_url', v_existing.file_url,
      'file_name', v_existing.file_name,
      'submitted_at', v_existing.created_at
    ));

    -- Update with new submission + history
    UPDATE public.stage_submissions SET
      submission_type = p_submission_type,
      content = p_content,
      file_url = p_file_url,
      file_name = p_file_name,
      file_size = p_file_size,
      mime_type = p_mime_type,
      revision_history = v_history,
      created_at = now()
    WHERE stage_id = p_stage_id AND student_name = p_student_name;
  ELSE
    -- First submission
    INSERT INTO public.stage_submissions (
      quest_id, stage_id, student_name,
      submission_type, content,
      file_url, file_name, file_size, mime_type
    )
    VALUES (
      p_quest_id, p_stage_id, p_student_name,
      p_submission_type, p_content,
      p_file_url, p_file_name, p_file_size, p_mime_type
    );
  END IF;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_stage_work TO anon, authenticated;
-- 022: Learning outcomes + stage edit history

-- Add learning_outcomes JSONB column to parent_access
ALTER TABLE public.parent_access
ADD COLUMN IF NOT EXISTS learning_outcomes jsonb DEFAULT '[]';

-- Each entry: { id, category, description, priority, created_at }
-- category: academic | social-emotional | life-skills | creative
-- priority: high | medium | low

-- Update parent_onboard RPC to accept learning_outcomes
CREATE OR REPLACE FUNCTION public.parent_onboard(
  p_token text,
  p_name text,
  p_relationship text DEFAULT NULL,
  p_expectations text DEFAULT NULL,
  p_child_loves text DEFAULT NULL,
  p_priorities text[] DEFAULT '{}',
  p_learning_outcomes jsonb DEFAULT '[]'
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_row parent_access%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM parent_access WHERE access_token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid token');
  END IF;

  UPDATE parent_access SET
    parent_name = p_name,
    relationship = p_relationship,
    expectations = p_expectations,
    child_loves = p_child_loves,
    core_skill_priorities = p_priorities,
    learning_outcomes = COALESCE(p_learning_outcomes, '[]'::jsonb),
    onboarded_at = now()
  WHERE access_token = p_token;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC to update learning outcomes post-onboarding
CREATE OR REPLACE FUNCTION public.update_learning_outcomes(
  p_token text,
  p_outcomes jsonb
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE parent_access
  SET learning_outcomes = COALESCE(p_outcomes, '[]'::jsonb)
  WHERE access_token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid token');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Update get_parent_dashboard to include learning_outcomes
CREATE OR REPLACE FUNCTION public.get_parent_dashboard(p_token text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_pa parent_access%ROWTYPE;
  v_student students%ROWTYPE;
  v_quests jsonb;
  v_skills jsonb;
  v_snapshots jsonb;
BEGIN
  SELECT * INTO v_pa FROM public.parent_access WHERE access_token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invalid or expired link.');
  END IF;

  SELECT * INTO v_student FROM public.students WHERE id = v_pa.student_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Student not found.');
  END IF;

  -- Active quests with progress
  SELECT COALESCE(jsonb_agg(q), '[]'::jsonb) INTO v_quests
  FROM (
    SELECT
      qu.id, qu.title, qu.subtitle, qu.status, qu.parent_summary, qu.career_pathway,
      (SELECT count(*) FROM quest_stages qs WHERE qs.quest_id = qu.id AND qs.status = 'completed') AS stages_done,
      (SELECT count(*) FROM quest_stages qs WHERE qs.quest_id = qu.id) AS stages_total
    FROM quests qu
    JOIN quest_students qst ON qst.quest_id = qu.id
    WHERE qst.student_id = v_pa.student_id
      AND qu.status IN ('active', 'completed')
    ORDER BY qu.created_at DESC
  ) q;

  -- Current skills
  SELECT COALESCE(jsonb_agg(sk), '[]'::jsonb) INTO v_skills
  FROM (
    SELECT ss.proficiency, s.name AS skill_name, s.category, ss.updated_at
    FROM student_skills ss
    JOIN skills s ON s.id = ss.skill_id
    WHERE ss.student_id = v_pa.student_id
    ORDER BY s.sort_order
  ) sk;

  -- Recent snapshots
  SELECT COALESCE(jsonb_agg(sn), '[]'::jsonb) INTO v_snapshots
  FROM (
    SELECT sks.proficiency, sks.snapshot_at AS created_at, s.name AS skill_name
    FROM skill_snapshots sks
    JOIN skills s ON s.id = sks.skill_id
    WHERE sks.student_id = v_pa.student_id
    ORDER BY sks.snapshot_at DESC
    LIMIT 20
  ) sn;

  RETURN jsonb_build_object(
    'parent', jsonb_build_object(
      'parent_name', v_pa.parent_name,
      'relationship', v_pa.relationship,
      'expectations', v_pa.expectations,
      'child_loves', v_pa.child_loves,
      'core_skill_priorities', v_pa.core_skill_priorities,
      'learning_outcomes', COALESCE(v_pa.learning_outcomes, '[]'::jsonb),
      'onboarded_at', v_pa.onboarded_at
    ),
    'student', jsonb_build_object(
      'id', v_student.id,
      'name', v_student.name,
      'age', v_student.age,
      'grade_band', v_student.grade_band,
      'avatar_emoji', v_student.avatar_emoji,
      'interests', v_student.interests
    ),
    'quests', v_quests,
    'skills', v_skills,
    'snapshots', v_snapshots
  );
END;
$$;

-- Stage edit history table
CREATE TABLE IF NOT EXISTS public.stage_edit_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id uuid REFERENCES quest_stages(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  original_content jsonb NOT NULL,
  proposed_content jsonb NOT NULL,
  student_request text,
  accepted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.stage_edit_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DO $pol$ BEGIN
  CREATE POLICY "Anyone can insert stage edits"
    ON public.stage_edit_history FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DO $pol$ BEGIN
  CREATE POLICY "Anyone can read stage edits"
    ON public.stage_edit_history FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DO $pol$ BEGIN
  CREATE POLICY "Anyone can update stage edits"
    ON public.stage_edit_history FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
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
DO $pol$ BEGIN
  CREATE POLICY xp_events_guide_read ON xp_events FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM students WHERE guide_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
DO $pol$ BEGIN
  CREATE POLICY xp_events_anon_insert ON xp_events FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
DO $pol$ BEGIN
  CREATE POLICY xp_events_anon_read ON xp_events FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;

-- student_xp
ALTER TABLE student_xp ENABLE ROW LEVEL SECURITY;
DO $pol$ BEGIN
  CREATE POLICY student_xp_read ON student_xp FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
DO $pol$ BEGIN
  CREATE POLICY student_xp_guide_read ON student_xp FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM students WHERE guide_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
DO $pol$ BEGIN
  CREATE POLICY student_xp_anon_upsert ON student_xp FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
DO $pol$ BEGIN
  CREATE POLICY student_xp_anon_update ON student_xp FOR UPDATE TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;

-- badges
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
DO $pol$ BEGIN
  CREATE POLICY badges_read ON badges FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;

-- student_badges
ALTER TABLE student_badges ENABLE ROW LEVEL SECURITY;
DO $pol$ BEGIN
  CREATE POLICY student_badges_read ON student_badges FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
DO $pol$ BEGIN
  CREATE POLICY student_badges_insert ON student_badges FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;

-- stage_landmarks
ALTER TABLE stage_landmarks ENABLE ROW LEVEL SECURITY;
DO $pol$ BEGIN
  CREATE POLICY stage_landmarks_read ON stage_landmarks FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
DO $pol$ BEGIN
  CREATE POLICY stage_landmarks_auth_insert ON stage_landmarks FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
DO $pol$ BEGIN
  CREATE POLICY stage_landmarks_anon_insert ON stage_landmarks FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;

-- stage_interactive_data
ALTER TABLE stage_interactive_data ENABLE ROW LEVEL SECURITY;
DO $pol$ BEGIN
  CREATE POLICY stage_interactive_data_read ON stage_interactive_data FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
DO $pol$ BEGIN
  CREATE POLICY stage_interactive_data_auth_manage ON stage_interactive_data FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
DO $pol$ BEGIN
  CREATE POLICY stage_interactive_data_anon_insert ON stage_interactive_data FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;

-- explorer_log
ALTER TABLE explorer_log ENABLE ROW LEVEL SECURITY;
DO $pol$ BEGIN
  CREATE POLICY explorer_log_public_read ON explorer_log FOR SELECT USING (public = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
DO $pol$ BEGIN
  CREATE POLICY explorer_log_anon_insert ON explorer_log FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;

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
-- 024_truth_protocol.sql
-- Truth Protocol: source citations and guide overrides

-- Add sources JSONB to quest_stages (AI-generated references per stage)
ALTER TABLE quest_stages ADD COLUMN IF NOT EXISTS sources JSONB DEFAULT '[]';

-- Add sources JSONB to guide_messages (citations in Field Guide chat)
ALTER TABLE guide_messages ADD COLUMN IF NOT EXISTS sources JSONB DEFAULT '[]';

-- Add sources JSONB to submission_feedback (citations in AI feedback)
ALTER TABLE submission_feedback ADD COLUMN IF NOT EXISTS sources JSONB DEFAULT '[]';

-- Guide overrides on sources
CREATE TABLE IF NOT EXISTS source_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL CHECK (table_name IN ('quest_stages', 'guide_messages', 'submission_feedback')),
  record_id UUID NOT NULL,
  source_url TEXT NOT NULL,
  override_status TEXT NOT NULL CHECK (override_status IN ('verified_by_guide', 'incorrect')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_source_overrides_record ON source_overrides(table_name, record_id);

-- RLS
ALTER TABLE source_overrides ENABLE ROW LEVEL SECURITY;
DO $pol$ BEGIN
  CREATE POLICY source_overrides_auth_manage ON source_overrides FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
DO $pol$ BEGIN
  CREATE POLICY source_overrides_anon_read ON source_overrides FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
-- 025_year_plans.sql
-- Yearly Planning Mode: year plans and plan items

CREATE TABLE IF NOT EXISTS year_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  school_year TEXT NOT NULL,
  title TEXT DEFAULT '',
  target_outcomes JSONB DEFAULT '[]',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (guide_id, student_id, school_year)
);

CREATE TABLE IF NOT EXISTS year_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES year_plans(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  target_standards JSONB DEFAULT '[]',
  estimated_weeks INTEGER DEFAULT 2,
  interest_tags JSONB DEFAULT '[]',
  quest_id UUID REFERENCES quests(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'swapped')),
  month_target TEXT,
  ai_rationale TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_year_plans_guide ON year_plans(guide_id);
CREATE INDEX IF NOT EXISTS idx_year_plans_student ON year_plans(student_id);
CREATE INDEX IF NOT EXISTS idx_year_plan_items_plan ON year_plan_items(plan_id);

ALTER TABLE year_plans ENABLE ROW LEVEL SECURITY;
DO $pol$ BEGIN
  CREATE POLICY year_plans_guide_manage ON year_plans FOR ALL TO authenticated
  USING (guide_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
DO $pol$ BEGIN
  CREATE POLICY year_plans_anon_read ON year_plans FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;

ALTER TABLE year_plan_items ENABLE ROW LEVEL SECURITY;
DO $pol$ BEGIN
  CREATE POLICY year_plan_items_via_plan ON year_plan_items FOR ALL TO authenticated
  USING (plan_id IN (SELECT id FROM year_plans WHERE guide_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
DO $pol$ BEGIN
  CREATE POLICY year_plan_items_anon_read ON year_plan_items FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
-- 026_career_pathways.sql
-- Optional Career Pathways: career insights per student

CREATE TABLE IF NOT EXISTS student_career_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  career_title TEXT NOT NULL,
  description TEXT NOT NULL,
  reason TEXT NOT NULL,
  related_quest_ids JSONB DEFAULT '[]',
  source_urls JSONB DEFAULT '[]',
  category TEXT DEFAULT 'discovered' CHECK (category IN ('discovered', 'suggested', 'explored')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_career_insights_student ON student_career_insights(student_id);

ALTER TABLE student_career_insights ENABLE ROW LEVEL SECURITY;
DO $pol$ BEGIN
  CREATE POLICY career_insights_read ON student_career_insights FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
DO $pol$ BEGIN
  CREATE POLICY career_insights_anon_insert ON student_career_insights FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
DO $pol$ BEGIN
  CREATE POLICY career_insights_auth_manage ON student_career_insights FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;

-- Add career_insights_enabled to students (opt-in)
ALTER TABLE students ADD COLUMN IF NOT EXISTS career_insights_enabled BOOLEAN DEFAULT false;
-- 027_layer3_challenges.sql
-- Layer 3: Project Mode, Expedition Challenges, Skill Assessments

-- ============================================================
-- PROJECT MODE — hands-on vs digital preference per quest
-- ============================================================
ALTER TABLE quests ADD COLUMN IF NOT EXISTS project_mode TEXT DEFAULT 'mixed'
  CHECK (project_mode IN ('hands_on', 'digital', 'mixed'));

-- ============================================================
-- EXPEDITION CHALLENGES — gamified knowledge checks per stage
-- ============================================================
CREATE TABLE IF NOT EXISTS expedition_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES quest_stages(id) ON DELETE CASCADE,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN (
    'estimate', 'pattern', 'quick_write', 'classify', 'decode'
  )),
  challenge_text TEXT NOT NULL,
  challenge_config JSONB DEFAULT '{}',
  target_skill_ids JSONB DEFAULT '[]',
  ep_reward INTEGER DEFAULT 15,
  difficulty TEXT DEFAULT 'standard' CHECK (difficulty IN ('warmup', 'standard', 'stretch')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expedition_challenges_stage ON expedition_challenges(stage_id);

-- ============================================================
-- SKILL ASSESSMENTS — invisible assessment results
-- ============================================================
CREATE TABLE IF NOT EXISTS skill_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  skill_name TEXT NOT NULL,
  quest_id UUID REFERENCES quests(id) ON DELETE SET NULL,
  stage_id UUID REFERENCES quest_stages(id) ON DELETE SET NULL,
  assessment_type TEXT NOT NULL CHECK (assessment_type IN (
    'expedition_challenge', 'submission_review', 'conversation'
  )),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 4),
  evidence TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_assessments_student ON skill_assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_skill_assessments_student_skill ON skill_assessments(student_id, skill_name);

-- ============================================================
-- CHALLENGE RESPONSES — student answers to expedition challenges
-- ============================================================
CREATE TABLE IF NOT EXISTS challenge_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES expedition_challenges(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  is_successful BOOLEAN DEFAULT false,
  ep_awarded INTEGER DEFAULT 0,
  ai_feedback TEXT,
  assessed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(challenge_id, student_id)
);

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE expedition_challenges ENABLE ROW LEVEL SECURITY;
DO $pol$ BEGIN
  CREATE POLICY expedition_challenges_read ON expedition_challenges FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
DO $pol$ BEGIN
  CREATE POLICY expedition_challenges_anon_insert ON expedition_challenges FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
DO $pol$ BEGIN
  CREATE POLICY expedition_challenges_auth_manage ON expedition_challenges FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;

ALTER TABLE skill_assessments ENABLE ROW LEVEL SECURITY;
DO $pol$ BEGIN
  CREATE POLICY skill_assessments_guide_read ON skill_assessments FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM students WHERE guide_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
DO $pol$ BEGIN
  CREATE POLICY skill_assessments_anon_read ON skill_assessments FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
DO $pol$ BEGIN
  CREATE POLICY skill_assessments_anon_insert ON skill_assessments FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;

ALTER TABLE challenge_responses ENABLE ROW LEVEL SECURITY;
DO $pol$ BEGIN
  CREATE POLICY challenge_responses_read ON challenge_responses FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
DO $pol$ BEGIN
  CREATE POLICY challenge_responses_anon_insert ON challenge_responses FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
-- 028_layer4_community.sql
-- Layer 4: Accountability Buddies, Community Repository

-- ============================================================
-- BUDDY PAIRS — accountability partner assignments
-- ============================================================
CREATE TABLE IF NOT EXISTS buddy_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_a_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_b_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_a_id, student_b_id)
);

CREATE INDEX IF NOT EXISTS idx_buddy_pairs_students ON buddy_pairs(student_a_id, student_b_id);

-- ============================================================
-- BUDDY MESSAGES — encouragement between partners
-- ============================================================
CREATE TABLE IF NOT EXISTS buddy_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id UUID NOT NULL REFERENCES buddy_pairs(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- STALL ALERTS — guide notifications for inactive students
-- ============================================================
CREATE TABLE IF NOT EXISTS stall_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  days_inactive INTEGER NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'flagged_parent')),
  parent_flagged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stall_alerts_guide ON stall_alerts(guide_id, status);

-- ============================================================
-- COMMUNITY PROJECTS — shared completed projects
-- ============================================================
CREATE TABLE IF NOT EXISTS community_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tags JSONB DEFAULT '[]',
  grade_band TEXT,
  project_mode TEXT DEFAULT 'mixed',
  career_pathway TEXT,
  avg_rating NUMERIC(2,1) DEFAULT 0,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_projects_school ON community_projects(school_id);

-- ============================================================
-- COMMUNITY REVIEWS — ratings and comments on shared projects
-- ============================================================
CREATE TABLE IF NOT EXISTS community_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_project_id UUID NOT NULL REFERENCES community_projects(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(community_project_id, reviewer_id)
);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE buddy_pairs ENABLE ROW LEVEL SECURITY;
DO $pol$ BEGIN
  CREATE POLICY buddy_pairs_read ON buddy_pairs FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
DO $pol$ BEGIN
  CREATE POLICY buddy_pairs_auth_manage ON buddy_pairs FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
DO $pol$ BEGIN
  CREATE POLICY buddy_pairs_anon_read ON buddy_pairs FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;

ALTER TABLE buddy_messages ENABLE ROW LEVEL SECURITY;
DO $pol$ BEGIN
  CREATE POLICY buddy_messages_read ON buddy_messages FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
DO $pol$ BEGIN
  CREATE POLICY buddy_messages_anon_insert ON buddy_messages FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;

ALTER TABLE stall_alerts ENABLE ROW LEVEL SECURITY;
DO $pol$ BEGIN
  CREATE POLICY stall_alerts_auth_manage ON stall_alerts FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
DO $pol$ BEGIN
  CREATE POLICY stall_alerts_anon_read ON stall_alerts FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;

ALTER TABLE community_projects ENABLE ROW LEVEL SECURITY;
DO $pol$ BEGIN
  CREATE POLICY community_projects_read ON community_projects FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
DO $pol$ BEGIN
  CREATE POLICY community_projects_auth_manage ON community_projects FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;

ALTER TABLE community_reviews ENABLE ROW LEVEL SECURITY;
DO $pol$ BEGIN
  CREATE POLICY community_reviews_read ON community_reviews FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
DO $pol$ BEGIN
  CREATE POLICY community_reviews_auth_manage ON community_reviews FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;

-- ============================================================
-- RPC: Get inactive students for a guide
-- ============================================================
CREATE OR REPLACE FUNCTION get_inactive_students(
  p_guide_id UUID,
  p_days_threshold INTEGER DEFAULT 3
) RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  avatar_emoji TEXT,
  days_inactive INTEGER,
  last_active DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS student_id,
    s.name AS student_name,
    s.avatar_emoji,
    COALESCE(CURRENT_DATE - sx.last_active_date, 999) AS days_inactive,
    sx.last_active_date AS last_active
  FROM students s
  LEFT JOIN student_xp sx ON sx.student_id = s.id
  WHERE s.guide_id = p_guide_id
    AND (sx.last_active_date IS NULL OR CURRENT_DATE - sx.last_active_date >= p_days_threshold)
  ORDER BY days_inactive DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 029_layer5_branching.sql
-- Layer 5: Year Plan v2 (outcome balancing, packages) + Branching Narratives

-- ============================================================
-- YEAR PLAN V2 — outcome domain tracking
-- ============================================================

-- Add domain coverage tracking to year_plan_items
ALTER TABLE year_plan_items ADD COLUMN IF NOT EXISTS domain_coverage JSONB DEFAULT '{}';

-- Year Plan Packages — exportable multi-project bundles
CREATE TABLE IF NOT EXISTS year_plan_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES year_plans(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  grade_band TEXT,
  items_snapshot JSONB NOT NULL DEFAULT '[]',
  target_outcomes JSONB DEFAULT '[]',
  total_weeks INTEGER DEFAULT 0,
  avg_rating NUMERIC(2,1) DEFAULT 0,
  import_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE year_plan_packages ENABLE ROW LEVEL SECURITY;
DO $pol$ BEGIN
  CREATE POLICY year_plan_packages_read ON year_plan_packages FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
DO $pol$ BEGIN
  CREATE POLICY year_plan_packages_auth_manage ON year_plan_packages FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;

-- ============================================================
-- BRANCHING NARRATIVES — stage tree structure
-- ============================================================

CREATE TABLE IF NOT EXISTS stage_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES quest_stages(id) ON DELETE CASCADE,
  branch_index INTEGER NOT NULL,
  branch_label TEXT NOT NULL,
  branch_description TEXT,
  next_stage_id UUID REFERENCES quest_stages(id) ON DELETE SET NULL,
  narrative_variant TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(stage_id, branch_index)
);

CREATE INDEX IF NOT EXISTS idx_stage_branches_stage ON stage_branches(stage_id);
CREATE INDEX IF NOT EXISTS idx_stage_branches_next ON stage_branches(next_stage_id);

-- Student path choices — which branch each student took
CREATE TABLE IF NOT EXISTS student_stage_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES quest_stages(id) ON DELETE CASCADE,
  chosen_branch_index INTEGER NOT NULL,
  chosen_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, quest_id, stage_id)
);

CREATE INDEX IF NOT EXISTS idx_student_paths_student_quest ON student_stage_paths(student_id, quest_id);

-- Add is_branching flag to quests for easy filtering
ALTER TABLE quests ADD COLUMN IF NOT EXISTS is_branching BOOLEAN DEFAULT false;

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE stage_branches ENABLE ROW LEVEL SECURITY;
DO $pol$ BEGIN
  CREATE POLICY stage_branches_read ON stage_branches FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
DO $pol$ BEGIN
  CREATE POLICY stage_branches_auth_manage ON stage_branches FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
DO $pol$ BEGIN
  CREATE POLICY stage_branches_anon_insert ON stage_branches FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;

ALTER TABLE student_stage_paths ENABLE ROW LEVEL SECURITY;
DO $pol$ BEGIN
  CREATE POLICY student_stage_paths_read ON student_stage_paths FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
DO $pol$ BEGIN
  CREATE POLICY student_stage_paths_anon_insert ON student_stage_paths FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
DO $pol$ BEGIN
  CREATE POLICY student_stage_paths_anon_update ON student_stage_paths FOR UPDATE TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
-- 030_intake_skills.sql
-- Fix: student_intake now inserts self-assessment into student_skills table

CREATE OR REPLACE FUNCTION student_intake(
  p_code       TEXT,
  p_name       TEXT,
  p_age        INT DEFAULT NULL,
  p_grade_band TEXT DEFAULT NULL,
  p_email      TEXT DEFAULT NULL,
  p_interests  TEXT[] DEFAULT '{}',
  p_passions   TEXT[] DEFAULT '{}',
  p_about_me   TEXT DEFAULT '',
  p_avatar_emoji TEXT DEFAULT '',
  p_self_assessment JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_invite  RECORD;
  v_pin     TEXT;
  v_student RECORD;
  v_skill_id TEXT;
  v_proficiency TEXT;
BEGIN
  -- Validate invite
  SELECT * INTO v_invite
  FROM guide_invites
  WHERE code = p_code AND active = TRUE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Invalid invite code');
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Invite expired');
  END IF;

  IF v_invite.max_uses IS NOT NULL AND v_invite.use_count >= v_invite.max_uses THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Invite at capacity');
  END IF;

  -- Generate 4-digit PIN
  v_pin := LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');

  -- Create student
  INSERT INTO students (
    name, age, grade_band, email, interests, passions, about_me,
    avatar_emoji, self_assessment, guide_id, pin, invite_code, onboarded_at
  ) VALUES (
    p_name, p_age, p_grade_band, p_email, p_interests, p_passions, p_about_me,
    p_avatar_emoji, p_self_assessment, v_invite.guide_id, v_pin, p_code, now()
  )
  RETURNING * INTO v_student;

  -- Insert self-assessment into student_skills
  -- p_self_assessment format: { "skill_uuid": "proficiency_level", ... }
  FOR v_skill_id, v_proficiency IN
    SELECT key, value #>> '{}' FROM jsonb_each(p_self_assessment)
  LOOP
    INSERT INTO student_skills (student_id, skill_id, proficiency, source)
    VALUES (v_student.id, v_skill_id::UUID, v_proficiency, 'self')
    ON CONFLICT (student_id, skill_id) DO UPDATE SET
      proficiency = EXCLUDED.proficiency,
      source = 'self',
      updated_at = now();
  END LOOP;

  -- Increment invite use count
  UPDATE guide_invites SET use_count = use_count + 1 WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'student_id', v_student.id,
    'student_name', v_student.name,
    'pin', v_pin
  );
END;
$$;

-- Backfill: insert student_skills for existing students who have self_assessment data
-- but no corresponding student_skills rows
INSERT INTO student_skills (student_id, skill_id, proficiency, source)
SELECT
  s.id AS student_id,
  (kv.key)::UUID AS skill_id,
  kv.value #>> '{}' AS proficiency,
  'self' AS source
FROM students s,
  jsonb_each(s.self_assessment) AS kv(key, value)
WHERE s.self_assessment IS NOT NULL
  AND s.self_assessment != '{}'::JSONB
  AND EXISTS (SELECT 1 FROM skills WHERE id = (kv.key)::UUID)
ON CONFLICT (student_id, skill_id) DO NOTHING;
-- 031_fix_skill_snapshots.sql
-- Add missing columns to skill_snapshots and fix RLS for MasteryMap access

-- Add columns that api.js expects
ALTER TABLE skill_snapshots ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'ai';
ALTER TABLE skill_snapshots ADD COLUMN IF NOT EXISTS quest_id UUID REFERENCES quests(id) ON DELETE SET NULL;
ALTER TABLE skill_snapshots ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Add anon read policy so MasteryMap can load from student sessions
DO $$ BEGIN
  DO $pol$ BEGIN
  CREATE POLICY skill_snapshots_anon_read ON skill_snapshots FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add anon insert policy for student quest pages
DO $$ BEGIN
  DO $pol$ BEGIN
  CREATE POLICY skill_snapshots_anon_insert ON skill_snapshots FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $pol$;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- 032_world_scenes.sql
-- Add immersive 3D world scene columns to quests

ALTER TABLE quests ADD COLUMN IF NOT EXISTS world_scene_url TEXT;
ALTER TABLE quests ADD COLUMN IF NOT EXISTS world_hotspots JSONB DEFAULT '[]';
ALTER TABLE quests ADD COLUMN IF NOT EXISTS world_scene_prompt TEXT;
