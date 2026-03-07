-- 027_layer3_challenges.sql
-- Layer 3: Project Mode, Expedition Challenges, Skill Assessments

-- ============================================================
-- PROJECT MODE — hands-on vs digital preference per quest
-- ============================================================
ALTER TABLE quests ADD COLUMN IF NOT EXISTS project_mode TEXT DEFAULT 'mixed'
  CHECK (project_mode IN ('hands_on', 'digital', 'mixed'));

-- ============================================================
-- EXPEDITION CHALLENGES — gamified knowledge checks per stage
-- ============================================================
CREATE TABLE IF NOT EXISTS expedition_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES quest_stages(id) ON DELETE CASCADE,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN (
    'estimate', 'pattern', 'quick_write', 'classify', 'decode'
  )),
  challenge_text TEXT NOT NULL,
  challenge_config JSONB DEFAULT '{}',
  target_skill_ids JSONB DEFAULT '[]',
  ep_reward INTEGER DEFAULT 15,
  difficulty TEXT DEFAULT 'standard' CHECK (difficulty IN ('warmup', 'standard', 'stretch')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expedition_challenges_stage ON expedition_challenges(stage_id);

-- ============================================================
-- SKILL ASSESSMENTS — invisible assessment results
-- ============================================================
CREATE TABLE IF NOT EXISTS skill_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  skill_name TEXT NOT NULL,
  quest_id UUID REFERENCES quests(id) ON DELETE SET NULL,
  stage_id UUID REFERENCES quest_stages(id) ON DELETE SET NULL,
  assessment_type TEXT NOT NULL CHECK (assessment_type IN (
    'expedition_challenge', 'submission_review', 'conversation'
  )),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 4),
  evidence TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_assessments_student ON skill_assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_skill_assessments_student_skill ON skill_assessments(student_id, skill_name);

-- ============================================================
-- CHALLENGE RESPONSES — student answers to expedition challenges
-- ============================================================
CREATE TABLE IF NOT EXISTS challenge_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES expedition_challenges(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  is_successful BOOLEAN DEFAULT false,
  ep_awarded INTEGER DEFAULT 0,
  ai_feedback TEXT,
  assessed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(challenge_id, student_id)
);

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE expedition_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY expedition_challenges_read ON expedition_challenges FOR SELECT USING (true);
CREATE POLICY expedition_challenges_anon_insert ON expedition_challenges FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY expedition_challenges_auth_manage ON expedition_challenges FOR ALL TO authenticated USING (true);

ALTER TABLE skill_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY skill_assessments_guide_read ON skill_assessments FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM students WHERE guide_id = auth.uid()));
CREATE POLICY skill_assessments_anon_read ON skill_assessments FOR SELECT TO anon USING (true);
CREATE POLICY skill_assessments_anon_insert ON skill_assessments FOR INSERT TO anon WITH CHECK (true);

ALTER TABLE challenge_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY challenge_responses_read ON challenge_responses FOR SELECT USING (true);
CREATE POLICY challenge_responses_anon_insert ON challenge_responses FOR INSERT TO anon WITH CHECK (true);
