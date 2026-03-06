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
  SELECT * INTO v_row FROM parent_access WHERE token = p_token;
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
  WHERE token = p_token;

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
  WHERE token = p_token;

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
  SELECT * INTO v_pa FROM parent_access WHERE token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invalid or expired link.');
  END IF;

  SELECT * INTO v_student FROM students WHERE id = v_pa.student_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Student not found.');
  END IF;

  -- Get quests
  SELECT COALESCE(jsonb_agg(q ORDER BY q.created_at DESC), '[]'::jsonb)
  INTO v_quests
  FROM (
    SELECT
      qs.id, qs.title, qs.status, qs.parent_summary,
      qs.created_at,
      (SELECT COUNT(*) FROM quest_stages WHERE quest_id = qs.id) AS stages_total,
      (SELECT COUNT(*) FROM quest_stages WHERE quest_id = qs.id AND status = 'completed') AS stages_done
    FROM quest_students qst
    JOIN quests qs ON qs.id = qst.quest_id
    WHERE qst.student_id = v_pa.student_id
  ) q;

  -- Get skills
  SELECT COALESCE(jsonb_agg(sk ORDER BY sk.skill_name), '[]'::jsonb)
  INTO v_skills
  FROM (
    SELECT s.name AS skill_name, ss.proficiency
    FROM student_skills ss
    JOIN skills s ON s.id = ss.skill_id
    WHERE ss.student_id = v_pa.student_id
  ) sk;

  -- Get snapshots
  SELECT COALESCE(jsonb_agg(sn ORDER BY sn.created_at DESC), '[]'::jsonb)
  INTO v_snapshots
  FROM (
    SELECT s.name AS skill_name, snap.proficiency, snap.created_at
    FROM skill_snapshots snap
    JOIN skills s ON s.id = snap.skill_id
    WHERE snap.student_id = v_pa.student_id
    ORDER BY snap.created_at DESC
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
      'name', v_student.name,
      'age', v_student.age,
      'grade_band', v_student.grade_band,
      'avatar_emoji', v_student.avatar_emoji
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

CREATE POLICY "Anyone can insert stage edits"
  ON public.stage_edit_history FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read stage edits"
  ON public.stage_edit_history FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update stage edits"
  ON public.stage_edit_history FOR UPDATE
  USING (true);
