-- ═══════════════════════════════════════════════════════════════════════════════
-- 050: Server-side student PIN verification
--
-- Closes two holes:
--   A. /q/:id was sending every student's PIN to the browser as part of the
--      quest load query (`students(id, name, pin)`), then comparing client-side.
--      Anyone with the project link could read all PINs from DevTools.
--   B. `get_student_quests(uuid)` was anon-callable and required no PIN, so a
--      caller who guessed (or scraped) any student UUID could pull their full
--      quest history without authentication.
--
-- This migration:
--   1. Adds `get_quest_assigned_students(p_quest_id)` returning only
--      {id, name, has_pin} so the picker UI can render without seeing PINs.
--   2. Adds `verify_student_pin(p_quest_id, p_student_id, p_pin)` — the
--      server-side PIN check. Rate-limited via login_attempts (max 5 failed
--      attempts per student in 15 minutes).
--   3. Adds `get_student_quests_for_session(p_student_id, p_pin)` — a
--      PIN-verified replacement for the anon path of get_student_quests.
--   4. Revokes anon access to the original `get_student_quests(uuid)`.
--      Authenticated callers (and the SECURITY DEFINER call from
--      student_self_register in 010) keep working.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Picker data without PINs ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_quest_assigned_students(p_quest_id uuid)
RETURNS TABLE (id uuid, name text, has_pin boolean)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.name, (s.pin IS NOT NULL AND s.pin <> '')
  FROM public.quest_students qs
  JOIN public.students s ON s.id = qs.student_id
  WHERE qs.quest_id = p_quest_id
  ORDER BY s.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_quest_assigned_students(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_quest_assigned_students(uuid) TO authenticated;

-- ── 2. Server-side PIN verification with rate limiting ───────────────────────

CREATE OR REPLACE FUNCTION public.verify_student_pin(
  p_quest_id   uuid,
  p_student_id uuid,
  p_pin        text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student        public.students%ROWTYPE;
  v_assigned       boolean;
  v_recent_failures int;
  v_identifier     text := 'quest_pin_' || p_student_id::text;
BEGIN
  -- Rate limit: 5 failed attempts per student per 15 minutes
  SELECT COUNT(*) INTO v_recent_failures
  FROM public.login_attempts
  WHERE identifier = v_identifier
    AND success = FALSE
    AND attempted_at > now() - interval '15 minutes';

  IF v_recent_failures >= 5 THEN
    INSERT INTO public.login_attempts (identifier, success)
    VALUES (v_identifier, FALSE);
    RETURN jsonb_build_object('valid', FALSE, 'error', 'Too many attempts. Try again in 15 minutes.');
  END IF;

  -- Confirm the student is actually assigned to this quest
  SELECT EXISTS(
    SELECT 1 FROM public.quest_students
    WHERE quest_id = p_quest_id AND student_id = p_student_id
  ) INTO v_assigned;

  IF NOT v_assigned THEN
    INSERT INTO public.login_attempts (identifier, success)
    VALUES (v_identifier, FALSE);
    RETURN jsonb_build_object('valid', FALSE, 'error', 'Student is not assigned to this project.');
  END IF;

  -- Look up the student and compare PIN
  SELECT * INTO v_student FROM public.students WHERE id = p_student_id;

  IF NOT FOUND OR v_student.pin IS NULL OR v_student.pin = '' THEN
    -- Treat "no PIN set" as a soft success so the welcome flow still works for
    -- legacy students who were created before PINs were required.
    INSERT INTO public.login_attempts (identifier, success)
    VALUES (v_identifier, TRUE);
    RETURN jsonb_build_object(
      'valid', TRUE,
      'student_name', COALESCE(v_student.name, ''),
      'no_pin', TRUE
    );
  END IF;

  IF v_student.pin <> TRIM(p_pin) THEN
    INSERT INTO public.login_attempts (identifier, success)
    VALUES (v_identifier, FALSE);
    RETURN jsonb_build_object('valid', FALSE, 'error', 'That code doesn''t match.');
  END IF;

  INSERT INTO public.login_attempts (identifier, success)
  VALUES (v_identifier, TRUE);

  RETURN jsonb_build_object(
    'valid', TRUE,
    'student_name', v_student.name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_student_pin(uuid, uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_student_pin(uuid, uuid, text) TO authenticated;

-- ── 3. PIN-verified replacement for anon get_student_quests ──────────────────

CREATE OR REPLACE FUNCTION public.get_student_quests_for_session(
  p_student_id uuid,
  p_pin        text
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pin_match boolean;
BEGIN
  SELECT (pin IS NOT NULL AND pin <> '' AND pin = TRIM(p_pin))
  INTO v_pin_match
  FROM public.students WHERE id = p_student_id;

  IF NOT COALESCE(v_pin_match, FALSE) THEN
    RETURN '[]'::json;
  END IF;

  RETURN public.get_student_quests(p_student_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_quests_for_session(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_student_quests_for_session(uuid, text) TO authenticated;

-- ── 4. Close the original anon hole ──────────────────────────────────────────
-- Keep authenticated grant (used by guides) and the SECURITY DEFINER call from
-- student_self_register, which runs as definer regardless of caller role.

REVOKE EXECUTE ON FUNCTION public.get_student_quests(uuid) FROM anon;
