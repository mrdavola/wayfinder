-- ============================================================
-- 019: AI Project Suggestions & Guide Playbook
-- project_suggestions: AI-generated project ideas for students
-- guide_playbook: day-by-day facilitation plan for quests
-- ============================================================

CREATE TABLE IF NOT EXISTS project_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  standards_addressed TEXT[] DEFAULT '{}',
  career_connection TEXT,
  real_world_problem JSONB DEFAULT '{}',
  estimated_duration_days INTEGER DEFAULT 10,
  difficulty TEXT DEFAULT 'intermediate',
  status TEXT NOT NULL DEFAULT 'suggested'
    CHECK (status IN ('suggested','accepted','dismissed','converted')),
  converted_quest_id UUID REFERENCES quests(id) ON DELETE SET NULL,
  batch_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_suggestions_student ON project_suggestions(student_id);
CREATE INDEX IF NOT EXISTS idx_project_suggestions_student_status ON project_suggestions(student_id, status);
CREATE INDEX IF NOT EXISTS idx_project_suggestions_batch ON project_suggestions(batch_id);

ALTER TABLE project_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guides manage their suggestions"
  ON project_suggestions FOR ALL
  USING (guide_id = auth.uid())
  WITH CHECK (guide_id = auth.uid());

CREATE POLICY "Anon read suggestions"
  ON project_suggestions FOR SELECT
  USING (true);

-- ── Guide Playbook ──

CREATE TABLE IF NOT EXISTS guide_playbook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  prep_tasks TEXT[] DEFAULT '{}',
  materials TEXT[] DEFAULT '{}',
  facilitation_notes TEXT DEFAULT '',
  time_blocks JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(quest_id, day_number)
);

CREATE INDEX IF NOT EXISTS idx_guide_playbook_quest ON guide_playbook(quest_id);

ALTER TABLE guide_playbook ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guides manage playbook for their quests"
  ON guide_playbook FOR ALL
  USING (
    quest_id IN (
      SELECT id FROM quests WHERE guide_id = auth.uid()
    )
  )
  WITH CHECK (
    quest_id IN (
      SELECT id FROM quests WHERE guide_id = auth.uid()
    )
  );

CREATE POLICY "Anon read playbook"
  ON guide_playbook FOR SELECT
  USING (true);
