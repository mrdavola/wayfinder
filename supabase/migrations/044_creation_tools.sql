-- Extend submission_type to support new creation tool types
-- Note: Supabase/Postgres CHECK constraints need to be dropped and recreated
ALTER TABLE stage_submissions DROP CONSTRAINT IF EXISTS stage_submissions_submission_type_check;
ALTER TABLE stage_submissions ADD CONSTRAINT stage_submissions_submission_type_check
  CHECK (submission_type IN ('text', 'audio', 'video', 'file', 'canvas', 'sketch', 'slides'));

-- Add creation_data column for structured tool output (JSON)
ALTER TABLE stage_submissions ADD COLUMN IF NOT EXISTS creation_data JSONB;

-- Update the submit_stage_work RPC to accept creation_data
CREATE OR REPLACE FUNCTION public.submit_stage_work(
  p_quest_id       uuid,
  p_stage_id       uuid,
  p_student_name   text,
  p_submission_type text,
  p_content        text    DEFAULT NULL,
  p_file_url       text    DEFAULT NULL,
  p_file_name      text    DEFAULT NULL,
  p_file_size      bigint  DEFAULT NULL,
  p_mime_type      text    DEFAULT NULL,
  p_creation_data  jsonb   DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result json;
BEGIN
  INSERT INTO stage_submissions (quest_id, stage_id, student_name, submission_type, content, file_url, file_name, file_size, mime_type, creation_data)
  VALUES (p_quest_id, p_stage_id, p_student_name, p_submission_type, p_content, p_file_url, p_file_name, p_file_size, p_mime_type, p_creation_data)
  ON CONFLICT (stage_id, student_name)
  DO UPDATE SET
    submission_type = EXCLUDED.submission_type,
    content = EXCLUDED.content,
    file_url = EXCLUDED.file_url,
    file_name = EXCLUDED.file_name,
    file_size = EXCLUDED.file_size,
    mime_type = EXCLUDED.mime_type,
    creation_data = EXCLUDED.creation_data,
    created_at = now()
  RETURNING json_build_object('success', true, 'id', id) INTO result;

  RETURN result;
EXCEPTION WHEN others THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
