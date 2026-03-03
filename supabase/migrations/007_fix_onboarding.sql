-- Migration 007: Fix onboarding failures
-- 1. Add missing grade_bands column to schools (used in OnboardingPage insert)
-- 2. Broaden schools SELECT policy (auth.role() join context causes 400)
-- 3. Fix reflection_entries entry_type to allow 'feedback'
-- 4. Add student_stage_progress table for per-student tracking

-- ── Schools: add grade_bands ──────────────────────────────────────────────────
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS grade_bands text[] DEFAULT '{}';

-- ── Schools: fix SELECT policy so profile→schools join works ─────────────────
DROP POLICY IF EXISTS "Authenticated users can read schools" ON public.schools;
CREATE POLICY "Anyone can read schools"
  ON public.schools FOR SELECT USING (true);

-- ── reflection_entries: allow 'feedback' entry type ───────────────────────────
ALTER TABLE public.reflection_entries
  DROP CONSTRAINT IF EXISTS reflection_entries_entry_type_check;
ALTER TABLE public.reflection_entries
  ADD CONSTRAINT reflection_entries_entry_type_check
  CHECK (entry_type IN ('auto', 'student', 'feedback', 'guide'));

-- ── student_stage_progress: per-student stage tracking ───────────────────────
CREATE TABLE IF NOT EXISTS public.student_stage_progress (
  id                 uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  quest_id           uuid        REFERENCES public.quests(id)       ON DELETE CASCADE NOT NULL,
  stage_id           uuid        REFERENCES public.quest_stages(id) ON DELETE CASCADE NOT NULL,
  student_identifier text        NOT NULL,
  status             text        DEFAULT 'locked' CHECK (status IN ('locked', 'active', 'completed')),
  completed_at       timestamptz,
  created_at         timestamptz DEFAULT now(),
  UNIQUE (stage_id, student_identifier)
);

ALTER TABLE public.student_stage_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read student stage progress"
  ON public.student_stage_progress FOR SELECT USING (true);

CREATE POLICY "Public can insert student stage progress"
  ON public.student_stage_progress FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update student stage progress"
  ON public.student_stage_progress FOR UPDATE USING (true);
