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
    VALUES (v_student.id, v_skill_id::UUID, v_proficiency, 'self_assessment')
    ON CONFLICT (student_id, skill_id) DO UPDATE SET
      proficiency = EXCLUDED.proficiency,
      source = 'self_assessment',
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
  'self_assessment' AS source
FROM students s,
  jsonb_each(s.self_assessment) AS kv(key, value)
WHERE s.self_assessment IS NOT NULL
  AND s.self_assessment != '{}'::JSONB
  AND EXISTS (SELECT 1 FROM skills WHERE id = (kv.key)::UUID)
ON CONFLICT (student_id, skill_id) DO NOTHING;
