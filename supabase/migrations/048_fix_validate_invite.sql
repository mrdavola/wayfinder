-- ═══════════════════════════════════════════════════════════════════════════════
-- Fix validate_invite: handle guides with no school_id
--
-- Bug: v_school was declared as RECORD and only conditionally assigned. When the
-- guide had no school, v_school stayed unassigned and `v_school.name` in the
-- final RETURN threw "record 'v_school' is not assigned yet" → 500 from PostgREST.
-- Fix: use a TEXT variable initialized to '' instead of a RECORD.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION validate_invite(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_invite      RECORD;
  v_guide       RECORD;
  v_school_name TEXT := '';
BEGIN
  SELECT * INTO v_invite
  FROM guide_invites
  WHERE code = p_code AND active = TRUE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', FALSE, 'error', 'Invalid or expired invite code');
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RETURN jsonb_build_object('valid', FALSE, 'error', 'This invite link has expired');
  END IF;

  IF v_invite.max_uses IS NOT NULL AND v_invite.use_count >= v_invite.max_uses THEN
    RETURN jsonb_build_object('valid', FALSE, 'error', 'This invite link has reached its maximum uses');
  END IF;

  SELECT full_name, school_id INTO v_guide FROM profiles WHERE id = v_invite.guide_id;

  IF v_guide.school_id IS NOT NULL THEN
    SELECT name INTO v_school_name FROM schools WHERE id = v_guide.school_id;
  END IF;

  RETURN jsonb_build_object(
    'valid', TRUE,
    'guide_name',  COALESCE(v_guide.full_name, ''),
    'school_name', COALESCE(v_school_name, ''),
    'guide_id',    v_invite.guide_id,
    'school_id',   v_invite.school_id,
    'invite_id',   v_invite.id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION validate_invite(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION validate_invite(TEXT) TO authenticated;
