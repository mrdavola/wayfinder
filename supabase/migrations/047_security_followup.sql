-- 047_security_followup.sql
-- Closes P0 holes flagged in the 2026-04-29 audit:
--   1. parent_access cross-tenant data leak (any guide could read every parent)
--   2. parent_access column-name divergence (token vs access_token)
--   3. submit_stage_work accepted submissions without PIN — student impersonation

-- ============================================================
-- 1. Defensive column rename: parent_access.token -> access_token
--    16's exception branch created the table with column "token".
--    12 created it with "access_token". Either could be on prod.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'parent_access'
      AND column_name = 'token'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'parent_access'
      AND column_name = 'access_token'
  ) THEN
    ALTER TABLE public.parent_access RENAME COLUMN token TO access_token;
  END IF;
END $$;

-- ============================================================
-- 2. parent_access RLS — replace OR auth.uid() IS NOT NULL escape hatch
--    with ownership scoped to the student's guide.
-- ============================================================

DROP POLICY IF EXISTS "Anon can read by token"            ON public.parent_access;
DROP POLICY IF EXISTS "Anon can update by token"          ON public.parent_access;
DROP POLICY IF EXISTS "Anon can read own by token"        ON public.parent_access;
DROP POLICY IF EXISTS "Anon can update own by token"      ON public.parent_access;

CREATE POLICY "parent_access_select_by_token_or_owner"
  ON public.parent_access
  FOR SELECT
  USING (
    access_token = current_setting('request.headers', true)::json->>'x-parent-token'
    OR EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = parent_access.student_id
        AND s.guide_id = auth.uid()
    )
  );

CREATE POLICY "parent_access_update_by_token_or_owner"
  ON public.parent_access
  FOR UPDATE
  USING (
    access_token = current_setting('request.headers', true)::json->>'x-parent-token'
    OR EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = parent_access.student_id
        AND s.guide_id = auth.uid()
    )
  );

-- ============================================================
-- 3. submit_stage_work — require identity proof
--    Either an authenticated guide who owns the quest, OR a student PIN
--    that matches the named student. Drops every existing overload first
--    so there is exactly one canonical signature on prod.
-- ============================================================

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS sig
    FROM pg_proc
    WHERE proname = 'submit_stage_work'
      AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE format('DROP FUNCTION %s', r.sig);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.submit_stage_work(
  p_quest_id        uuid,
  p_stage_id        uuid,
  p_student_name    text,
  p_submission_type text,
  p_content         text   DEFAULT NULL,
  p_file_url        text   DEFAULT NULL,
  p_file_name       text   DEFAULT NULL,
  p_file_size       bigint DEFAULT NULL,
  p_mime_type       text   DEFAULT NULL,
  p_creation_data   jsonb  DEFAULT NULL,
  p_pin             text   DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_student_id uuid;
  v_owns_quest boolean := false;
  v_result json;
BEGIN
  -- Path A: authenticated guide who owns this quest
  IF v_caller IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.quests
      WHERE id = p_quest_id AND guide_id = v_caller
    ) INTO v_owns_quest;
  END IF;

  -- Path B: anonymous caller must supply a valid PIN for the named student
  IF NOT v_owns_quest THEN
    IF p_pin IS NULL OR LENGTH(TRIM(p_pin)) = 0 THEN
      RETURN json_build_object('success', false, 'error', 'PIN required');
    END IF;
    SELECT id INTO v_student_id
    FROM public.students
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(p_student_name))
      AND pin = TRIM(p_pin)
    LIMIT 1;
    IF v_student_id IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Invalid student credentials');
    END IF;
  END IF;

  INSERT INTO public.stage_submissions (
    quest_id, stage_id, student_name,
    submission_type, content, file_url, file_name, file_size, mime_type, creation_data
  ) VALUES (
    p_quest_id, p_stage_id, TRIM(p_student_name),
    p_submission_type, p_content, p_file_url, p_file_name, p_file_size, p_mime_type, p_creation_data
  )
  ON CONFLICT (stage_id, student_name) DO UPDATE SET
    submission_type = EXCLUDED.submission_type,
    content         = EXCLUDED.content,
    file_url        = EXCLUDED.file_url,
    file_name       = EXCLUDED.file_name,
    file_size       = EXCLUDED.file_size,
    mime_type       = EXCLUDED.mime_type,
    creation_data   = EXCLUDED.creation_data,
    created_at      = now()
  RETURNING json_build_object('success', true, 'id', id) INTO v_result;

  RETURN v_result;
EXCEPTION WHEN others THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_stage_work(
  uuid, uuid, text, text, text, text, text, bigint, text, jsonb, text
) TO anon, authenticated;
