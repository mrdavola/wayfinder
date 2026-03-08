-- Skill dependency graph: which skills lead to which
CREATE TABLE IF NOT EXISTS skill_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  depends_on_skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  relationship TEXT DEFAULT 'prerequisite'
    CHECK (relationship IN ('prerequisite', 'related', 'builds_on')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(skill_id, depends_on_skill_id)
);

CREATE INDEX IF NOT EXISTS idx_skill_deps_skill ON skill_dependencies(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_deps_parent ON skill_dependencies(depends_on_skill_id);

-- RLS: readable by authenticated users
ALTER TABLE skill_dependencies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY skill_deps_read ON skill_dependencies FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY skill_deps_write ON skill_dependencies FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed default dependencies between existing skills
-- These connect the skill catalog into a meaningful graph
INSERT INTO skill_dependencies (skill_id, depends_on_skill_id, relationship)
SELECT s1.id, s2.id, 'builds_on'
FROM skills s1, skills s2
WHERE (s1.name, s2.name) IN (
  ('Critical Thinking', 'Reading Comprehension'),
  ('Problem Solving', 'Math Reasoning'),
  ('Problem Solving', 'Critical Thinking'),
  ('Data Analysis', 'Math Reasoning'),
  ('Data Analysis', 'Statistics'),
  ('Research', 'Reading Comprehension'),
  ('Research', 'Critical Thinking'),
  ('Scientific Thinking', 'Research'),
  ('Scientific Thinking', 'Problem Solving'),
  ('Environmental Science', 'Scientific Thinking'),
  ('Engineering', 'Problem Solving'),
  ('Engineering', 'Scientific Thinking'),
  ('Digital Design', 'Creativity'),
  ('Game Design', 'Digital Design'),
  ('Game Design', 'Problem Solving'),
  ('Public Speaking', 'Communication'),
  ('Storytelling', 'Writing'),
  ('Storytelling', 'Creativity'),
  ('Digital Literacy', 'Technology'),
  ('Coding', 'Problem Solving'),
  ('Coding', 'Technology'),
  ('Leadership', 'Collaboration'),
  ('Leadership', 'Communication'),
  ('History & Civics', 'Reading Comprehension'),
  ('Geography & Culture', 'Research'),
  ('Economics & Financial Literacy', 'Math Reasoning')
)
ON CONFLICT DO NOTHING;
