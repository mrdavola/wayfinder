-- 024_truth_protocol.sql
-- Truth Protocol: source citations and guide overrides

-- Add sources JSONB to quest_stages (AI-generated references per stage)
ALTER TABLE quest_stages ADD COLUMN IF NOT EXISTS sources JSONB DEFAULT '[]';

-- Add sources JSONB to guide_messages (citations in Field Guide chat)
ALTER TABLE guide_messages ADD COLUMN IF NOT EXISTS sources JSONB DEFAULT '[]';

-- Add sources JSONB to submission_feedback (citations in AI feedback)
ALTER TABLE submission_feedback ADD COLUMN IF NOT EXISTS sources JSONB DEFAULT '[]';

-- Guide overrides on sources
CREATE TABLE IF NOT EXISTS source_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL CHECK (table_name IN ('quest_stages', 'guide_messages', 'submission_feedback')),
  record_id UUID NOT NULL,
  source_url TEXT NOT NULL,
  override_status TEXT NOT NULL CHECK (override_status IN ('verified_by_guide', 'incorrect')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_source_overrides_record ON source_overrides(table_name, record_id);

-- RLS
ALTER TABLE source_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY source_overrides_auth_manage ON source_overrides FOR ALL TO authenticated USING (true);
CREATE POLICY source_overrides_anon_read ON source_overrides FOR SELECT TO anon USING (true);
