-- ═══════════════════════════════════════════════════════════════════════════════
-- 053: PIN-verified submissions read for students
--
-- The original `get_stage_submissions_for_student(p_quest_id, p_student_name)`
-- in migration 011 took a plain student name and returned all that student's
-- work. Combined with the publicly-listable picker on /q/:id, anyone could
-- read every other student's submitted work for any project.
--
-- This migration:
--   1. Adds a PIN-verified replacement that takes student_id + PIN.
--   2. Revokes anon access to the original. Authenticated guides keep access
--      (they have RLS-checked direct-table reads via get_stage_submissions
--      anyway, but we leave the function callable to avoid breaking other
--      tools).
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_stage_submissions_for_session(
  p_quest_id   uuid,
  p_student_id uuid,
  p_pin        text
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pin_match boolean;
  v_student_name text;
BEGIN
  SELECT
    (pin IS NULL OR pin = '' OR pin = TRIM(p_pin)),
    name
  INTO v_pin_match, v_student_name
  FROM public.students WHERE id = p_student_id;

  IF NOT COALESCE(v_pin_match, FALSE) THEN
    RETURN '[]'::json;
  END IF;

  -- Confirm assignment so a verified student can't read another quest's data
  IF NOT EXISTS (
    SELECT 1 FROM public.quest_students
    WHERE quest_id = p_quest_id AND student_id = p_student_id
  ) THEN
    RETURN '[]'::json;
  END IF;

  RETURN (
    SELECT COALESCE(
      json_agg(row_to_json(s.*) ORDER BY s.created_at ASC),
      '[]'::json
    )
    FROM public.stage_submissions s
    WHERE s.quest_id = p_quest_id
      AND s.student_name = v_student_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_stage_submissions_for_session(uuid, uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_stage_submissions_for_session(uuid, uuid, text) TO authenticated;

-- Close the original anon hole. Authenticated callers keep access for legacy
-- tooling.
REVOKE EXECUTE ON FUNCTION public.get_stage_submissions_for_student(uuid, text) FROM anon;
