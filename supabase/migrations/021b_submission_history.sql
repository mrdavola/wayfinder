-- ============================================================
-- 021: Submission Revision History
-- Keeps previous attempts when students resubmit
-- ============================================================

-- Add revision_history column
ALTER TABLE public.stage_submissions
  ADD COLUMN IF NOT EXISTS revision_history JSONB DEFAULT '[]';

-- Update submit_stage_work to preserve previous attempt
CREATE OR REPLACE FUNCTION public.submit_stage_work(
  p_quest_id       uuid,
  p_stage_id       uuid,
  p_student_name   text,
  p_submission_type text,
  p_content        text DEFAULT NULL,
  p_file_url       text DEFAULT NULL,
  p_file_name      text DEFAULT NULL,
  p_file_size      bigint DEFAULT NULL,
  p_mime_type      text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing RECORD;
  v_history JSONB;
BEGIN
  -- Check if there's an existing submission to archive
  SELECT * INTO v_existing
  FROM public.stage_submissions
  WHERE stage_id = p_stage_id AND student_name = p_student_name;

  IF FOUND THEN
    -- Build history entry from existing submission
    v_history := COALESCE(v_existing.revision_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'submission_type', v_existing.submission_type,
      'content', v_existing.content,
      'file_url', v_existing.file_url,
      'file_name', v_existing.file_name,
      'submitted_at', v_existing.created_at
    ));

    -- Update with new submission + history
    UPDATE public.stage_submissions SET
      submission_type = p_submission_type,
      content = p_content,
      file_url = p_file_url,
      file_name = p_file_name,
      file_size = p_file_size,
      mime_type = p_mime_type,
      revision_history = v_history,
      created_at = now()
    WHERE stage_id = p_stage_id AND student_name = p_student_name;
  ELSE
    -- First submission
    INSERT INTO public.stage_submissions (
      quest_id, stage_id, student_name,
      submission_type, content,
      file_url, file_name, file_size, mime_type
    )
    VALUES (
      p_quest_id, p_stage_id, p_student_name,
      p_submission_type, p_content,
      p_file_url, p_file_name, p_file_size, p_mime_type
    );
  END IF;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_stage_work TO anon, authenticated;
