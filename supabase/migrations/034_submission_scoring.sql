-- Add scoring columns to submission_feedback
ALTER TABLE submission_feedback ADD COLUMN IF NOT EXISTS score INTEGER;
ALTER TABLE submission_feedback ADD COLUMN IF NOT EXISTS score_max INTEGER DEFAULT 50;
ALTER TABLE submission_feedback ADD COLUMN IF NOT EXISTS hints TEXT;
ALTER TABLE submission_feedback ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1;

-- Allow multiple submissions per stage per student (drop old unique constraint if exists)
ALTER TABLE stage_submissions DROP CONSTRAINT IF EXISTS stage_submissions_stage_id_student_name_key;

-- Add attempt tracking to stage_submissions
ALTER TABLE stage_submissions ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1;

-- New unique constraint: one submission per stage per student per attempt
DO $$ BEGIN
  ALTER TABLE stage_submissions ADD CONSTRAINT stage_submissions_stage_student_attempt_key
    UNIQUE(stage_id, student_name, attempt_number);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Index for quick lookup of latest submission
CREATE INDEX IF NOT EXISTS idx_submission_feedback_score
  ON submission_feedback(quest_id, stage_id, student_name, attempt_number);
