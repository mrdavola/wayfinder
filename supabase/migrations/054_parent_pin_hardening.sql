-- ═══════════════════════════════════════════════════════════════════════════════
-- 054: Harden parent_join_by_pin
--
-- Issues with the 040-era version:
--   * 4-digit PIN → 9000 possibilities (trivial brute force given enough time)
--   * Rate limit keyed only on the PIN value, so an attacker can iterate values
--   * Once `success`, returns a long-lived parent access token
--   * IP address never recorded in login_attempts
--
-- This migration:
--   * Adds a required second factor: student first name (case-insensitive)
--   * Tightens per-PIN rate limit to 3 in 30 minutes
--   * Adds an IP-based composite limit (20 attempts / 30 minutes / IP)
--   * Captures IP into login_attempts.ip_address from request headers so we
--     can audit lockouts later
--
-- Existing parents who already onboarded keep their access_token. Only the
-- /parent landing form (joining for the first time) is affected.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop the old 1-arg version so PostgREST picks the new signature unambiguously
DROP FUNCTION IF EXISTS public.parent_join_by_pin(text);

CREATE OR REPLACE FUNCTION public.parent_join_by_pin(
  p_pin   text,
  p_first_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student        RECORD;
  v_pa             RECORD;
  v_pin_failures   int;
  v_ip_failures    int;
  v_ip             text;
  v_pin            text := TRIM(p_pin);
  v_first_norm     text := LOWER(TRIM(COALESCE(p_first_name, '')));
  v_student_first  text;
BEGIN
  IF v_pin = '' OR v_first_norm = '' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Both code and name are required.');
  END IF;

  -- Best-effort IP capture from PostgREST headers
  BEGIN
    v_ip := split_part(
      COALESCE(current_setting('request.headers', TRUE)::json->>'x-forwarded-for', ''),
      ',', 1
    );
    v_ip := NULLIF(TRIM(v_ip), '');
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
  END;

  -- Per-PIN rate limit: 3 failures in 30 minutes
  SELECT COUNT(*) INTO v_pin_failures
  FROM public.login_attempts
  WHERE identifier = 'parent_pin_' || v_pin
    AND success = FALSE
    AND attempted_at > now() - interval '30 minutes';

  IF v_pin_failures >= 3 THEN
    INSERT INTO public.login_attempts (identifier, ip_address, success)
    VALUES ('parent_pin_' || v_pin, v_ip, FALSE);
    RETURN jsonb_build_object('success', FALSE, 'error', 'Too many attempts. Try again later.');
  END IF;

  -- Per-IP rate limit: 20 failures across all parent_pin attempts in 30 min
  IF v_ip IS NOT NULL THEN
    SELECT COUNT(*) INTO v_ip_failures
    FROM public.login_attempts
    WHERE ip_address = v_ip
      AND identifier LIKE 'parent_pin_%'
      AND success = FALSE
      AND attempted_at > now() - interval '30 minutes';

    IF v_ip_failures >= 20 THEN
      INSERT INTO public.login_attempts (identifier, ip_address, success)
      VALUES ('parent_pin_' || v_pin, v_ip, FALSE);
      RETURN jsonb_build_object('success', FALSE, 'error', 'Too many attempts. Try again later.');
    END IF;
  END IF;

  -- Look up student by PIN
  SELECT id, name, age, grade_band, avatar_emoji
  INTO v_student
  FROM public.students
  WHERE pin = v_pin;

  IF NOT FOUND THEN
    INSERT INTO public.login_attempts (identifier, ip_address, success)
    VALUES ('parent_pin_' || v_pin, v_ip, FALSE);
    RETURN jsonb_build_object('success', FALSE, 'error', 'Invalid PIN');
  END IF;

  -- Verify second factor: first name match (split on whitespace, compare first token)
  v_student_first := LOWER(TRIM(split_part(COALESCE(v_student.name, ''), ' ', 1)));
  IF v_student_first IS NULL OR v_student_first = '' OR v_student_first <> v_first_norm THEN
    INSERT INTO public.login_attempts (identifier, ip_address, success)
    VALUES ('parent_pin_' || v_pin, v_ip, FALSE);
    -- Same generic error so an attacker can't distinguish "wrong PIN" from "wrong name"
    RETURN jsonb_build_object('success', FALSE, 'error', 'Invalid PIN');
  END IF;

  -- Find or create the parent_access row
  SELECT * INTO v_pa
  FROM public.parent_access
  WHERE student_id = v_student.id;

  IF NOT FOUND THEN
    INSERT INTO public.parent_access (student_id)
    VALUES (v_student.id)
    RETURNING * INTO v_pa;
  END IF;

  INSERT INTO public.login_attempts (identifier, ip_address, success)
  VALUES ('parent_pin_' || v_pin, v_ip, TRUE);

  RETURN jsonb_build_object(
    'success', TRUE,
    'token', v_pa.access_token,
    'student_name', v_student.name,
    'is_new', v_pa.parent_name IS NULL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.parent_join_by_pin(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.parent_join_by_pin(text, text) TO authenticated;

-- The 1-arg version was dropped above, so any client on an old build will now
-- get a "function does not exist" error rather than a successful PIN-only call.
-- That's the desired behavior — fail closed during the deploy window.
