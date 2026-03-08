-- Skill exploration trees: student-initiated mini skill trees
CREATE TABLE IF NOT EXISTS skill_explorations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'abandoned')),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Individual nodes within a skill exploration tree
CREATE TABLE IF NOT EXISTS exploration_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exploration_id UUID NOT NULL REFERENCES skill_explorations(id) ON DELETE CASCADE,
  parent_node_id UUID REFERENCES exploration_nodes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  node_type TEXT DEFAULT 'skill'
    CHECK (node_type IN ('root', 'skill', 'challenge')),
  status TEXT DEFAULT 'locked'
    CHECK (status IN ('locked', 'active', 'completed')),
  -- Content (AI-generated)
  one_pager TEXT,
  video_url TEXT,
  video_title TEXT,
  action_item TEXT,
  resources JSONB DEFAULT '[]',
  -- Submission & scoring
  submission_text TEXT,
  score INTEGER,
  score_feedback TEXT,
  attempt_number INTEGER DEFAULT 0,
  -- Layout
  x FLOAT DEFAULT 0,
  y FLOAT DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exploration_student ON skill_explorations(student_id);
CREATE INDEX IF NOT EXISTS idx_exploration_nodes_tree ON exploration_nodes(exploration_id);
CREATE INDEX IF NOT EXISTS idx_exploration_nodes_parent ON exploration_nodes(parent_node_id);

ALTER TABLE skill_explorations ENABLE ROW LEVEL SECURITY;
ALTER TABLE exploration_nodes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY exploration_all ON skill_explorations FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY exploration_nodes_all ON exploration_nodes FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
