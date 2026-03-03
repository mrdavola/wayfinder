-- 011_stage_submissions.sql
-- Stage-level work submissions from students

-- ===================== TABLE =====================
CREATE TABLE IF NOT EXISTS public.stage_submissions (
  id               uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  quest_id         uuid    REFERENCES public.quests(id) ON DELETE CASCADE NOT NULL,
  stage_id         uuid    REFERENCES public.quest_stages(id) ON DELETE CASCADE NOT NULL,
  student_name     text    NOT NULL,
  student_id       uuid    REFERENCES public.students(id) ON DELETE SET NULL,
  submission_type  text    NOT NULL CHECK (submission_type IN ('text', 'audio', 'video', 'file')),
  content          text,       -- text submissions
  file_url         text,       -- Supabase Storage public URL
  file_name        text,
  file_size        bigint,
  mime_type        text,
  created_at       timestamptz DEFAULT now(),
  UNIQUE (stage_id, student_name)
);

ALTER TABLE public.stage_submissions ENABLE ROW LEVEL SECURITY;

-- Guides can read submissions for quests they own
CREATE POLICY "guides_read_submissions" ON public.stage_submissions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.quests q
    WHERE q.id = quest_id AND q.guide_id = auth.uid()
  ));

-- ===================== STORAGE BUCKET =====================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('student-submissions', 'student-submissions', true, 52428800)
ON CONFLICT DO NOTHING;

-- Allow anyone (PIN-auth students have no Supabase auth) to upload
CREATE POLICY "public_upload_submissions" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'student-submissions');

CREATE POLICY "public_read_submissions" ON storage.objects
  FOR SELECT USING (bucket_id = 'student-submissions');

-- ===================== RPC: submit_stage_work =====================
-- SECURITY DEFINER so PIN-auth (anon) students can insert submissions
CREATE OR REPLACE FUNCTION public.submit_stage_work(
  p_quest_id       uuid,
  p_stage_id       uuid,
  p_student_name   text,
  p_submission_type text,
  p_content        text    DEFAULT NULL,
  p_file_url       text    DEFAULT NULL,
  p_file_name      text    DEFAULT NULL,
  p_file_size      bigint  DEFAULT NULL,
  p_mime_type      text    DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.stage_submissions (
    quest_id, stage_id, student_name,
    submission_type, content,
    file_url, file_name, file_size, mime_type
  )
  VALUES (
    p_quest_id, p_stage_id, p_student_name,
    p_submission_type, p_content,
    p_file_url, p_file_name, p_file_size, p_mime_type
  )
  ON CONFLICT (stage_id, student_name) DO UPDATE SET
    submission_type = EXCLUDED.submission_type,
    content         = EXCLUDED.content,
    file_url        = EXCLUDED.file_url,
    file_name       = EXCLUDED.file_name,
    file_size       = EXCLUDED.file_size,
    mime_type       = EXCLUDED.mime_type,
    created_at      = now();

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_stage_work TO anon, authenticated;

-- ===================== RPC: get_stage_submissions_for_student =====================
-- SECURITY DEFINER so PIN-auth students can read their own submissions
CREATE OR REPLACE FUNCTION public.get_stage_submissions_for_student(
  p_quest_id     uuid,
  p_student_name text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      json_agg(row_to_json(s.*) ORDER BY s.created_at ASC),
      '[]'::json
    )
    FROM public.stage_submissions s
    WHERE s.quest_id = p_quest_id
      AND s.student_name = p_student_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_stage_submissions_for_student TO anon, authenticated;

-- ===================== RPC: get_stage_submissions (guide view) =====================
-- Only callable by authenticated guides who own the quest
CREATE OR REPLACE FUNCTION public.get_stage_submissions(
  p_quest_id uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller owns this quest
  IF NOT EXISTS (
    SELECT 1 FROM public.quests q
    WHERE q.id = p_quest_id AND q.guide_id = auth.uid()
  ) THEN
    RETURN '[]'::json;
  END IF;

  RETURN (
    SELECT COALESCE(
      json_agg(row_to_json(s.*) ORDER BY s.created_at DESC),
      '[]'::json
    )
    FROM public.stage_submissions s
    WHERE s.quest_id = p_quest_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_stage_submissions TO authenticated;
