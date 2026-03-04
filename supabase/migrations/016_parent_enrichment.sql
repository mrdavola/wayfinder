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
  CREATE TABLE public.parent_access (
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
  CREATE POLICY "Guides can manage parent access" ON public.parent_access
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.students s WHERE s.id = student_id AND s.guide_id = auth.uid()
      )
    );
  CREATE POLICY "Anon can read by token" ON public.parent_access
    FOR SELECT USING (true);
  CREATE POLICY "Anon can update by token" ON public.parent_access
    FOR UPDATE USING (true);
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
$$;