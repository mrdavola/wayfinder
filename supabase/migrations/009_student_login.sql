-- Migration 009: Student PIN login system
-- Run in Supabase SQL Editor

-- ── 1. Add pin column to students ────────────────────────────────────────────
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS pin text;

-- Auto-generate 4-digit PINs for existing students that don't have one
UPDATE public.students
SET pin = LPAD(FLOOR(RANDOM() * 9000 + 1000)::text, 4, '0')
WHERE pin IS NULL;

-- ── 2. student_login() — verify name + PIN, return student data ───────────────
-- Called by unauthenticated users (students). SECURITY DEFINER bypasses RLS.
CREATE OR REPLACE FUNCTION public.student_login(p_name text, p_pin text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student public.students%ROWTYPE;
BEGIN
  SELECT * INTO v_student
  FROM public.students
  WHERE LOWER(TRIM(name)) = LOWER(TRIM(p_name))
    AND pin = TRIM(p_pin)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN json_build_object(
    'id',         v_student.id,
    'name',       v_student.name,
    'grade_band', v_student.grade_band
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.student_login(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.student_login(text, text) TO authenticated;

-- ── 3. get_student_quests() — return all quests for a student ─────────────────
CREATE OR REPLACE FUNCTION public.get_student_quests(p_student_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_agg(row_data ORDER BY row_data->>'created_at' DESC)
  INTO v_result
  FROM (
    SELECT json_build_object(
      'id',                  q.id,
      'title',               q.title,
      'subtitle',            q.subtitle,
      'narrative_hook',      q.narrative_hook,
      'career_pathway',      q.career_pathway,
      'status',              q.status,
      'total_duration_days', q.total_duration_days,
      'created_at',          q.created_at,
      'stages_completed', (
        SELECT COUNT(*) FROM public.quest_stages qs2
        WHERE qs2.quest_id = q.id AND qs2.status = 'completed'
      ),
      'total_stages', (
        SELECT COUNT(*) FROM public.quest_stages qs3
        WHERE qs3.quest_id = q.id
      )
    ) AS row_data
    FROM public.quests q
    JOIN public.quest_students qs ON qs.quest_id = q.id
    WHERE qs.student_id = p_student_id
      AND q.status IN ('active', 'completed')
  ) sub;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_quests(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_student_quests(uuid) TO authenticated;
