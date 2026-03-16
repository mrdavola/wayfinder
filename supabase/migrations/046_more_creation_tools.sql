-- Migration 046: Expand submission_type to support 5 new creation tools
ALTER TABLE stage_submissions DROP CONSTRAINT IF EXISTS stage_submissions_submission_type_check;
ALTER TABLE stage_submissions ADD CONSTRAINT stage_submissions_submission_type_check
  CHECK (submission_type IN ('text', 'audio', 'video', 'file', 'canvas', 'sketch', 'slides', 'evidence_board', 'ranking', 'survey', 'checklist', 'comparison'));
