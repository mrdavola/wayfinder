-- 026_career_pathways.sql
-- Optional Career Pathways: career insights per student

CREATE TABLE IF NOT EXISTS student_career_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  career_title TEXT NOT NULL,
  description TEXT NOT NULL,
  reason TEXT NOT NULL,
  related_quest_ids JSONB DEFAULT '[]',
  source_urls JSONB DEFAULT '[]',
  category TEXT DEFAULT 'discovered' CHECK (category IN ('discovered', 'suggested', 'explored')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_career_insights_student ON student_career_insights(student_id);

ALTER TABLE student_career_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY career_insights_read ON student_career_insights FOR SELECT USING (true);
CREATE POLICY career_insights_anon_insert ON student_career_insights FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY career_insights_auth_manage ON student_career_insights FOR ALL TO authenticated USING (true);

-- Add career_insights_enabled to students (opt-in)
ALTER TABLE students ADD COLUMN IF NOT EXISTS career_insights_enabled BOOLEAN DEFAULT false;
