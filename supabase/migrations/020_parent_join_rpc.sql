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
      'token', COALESCE(v_pa.token, v_pa.access_token),
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
    'token', COALESCE(v_pa.token, v_pa.access_token),
    'student_name', v_student.name,
    'is_new', true
  );
END;
$$;
