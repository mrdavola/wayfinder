-- 025_year_plans.sql
-- Yearly Planning Mode: year plans and plan items

CREATE TABLE IF NOT EXISTS year_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  school_year TEXT NOT NULL,
  title TEXT DEFAULT '',
  target_outcomes JSONB DEFAULT '[]',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (guide_id, student_id, school_year)
);

CREATE TABLE IF NOT EXISTS year_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES year_plans(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  target_standards JSONB DEFAULT '[]',
  estimated_weeks INTEGER DEFAULT 2,
  interest_tags JSONB DEFAULT '[]',
  quest_id UUID REFERENCES quests(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'swapped')),
  month_target TEXT,
  ai_rationale TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_year_plans_guide ON year_plans(guide_id);
CREATE INDEX IF NOT EXISTS idx_year_plans_student ON year_plans(student_id);
CREATE INDEX IF NOT EXISTS idx_year_plan_items_plan ON year_plan_items(plan_id);

ALTER TABLE year_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY year_plans_guide_manage ON year_plans FOR ALL TO authenticated
  USING (guide_id = auth.uid());
CREATE POLICY year_plans_anon_read ON year_plans FOR SELECT TO anon USING (true);

ALTER TABLE year_plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY year_plan_items_via_plan ON year_plan_items FOR ALL TO authenticated
  USING (plan_id IN (SELECT id FROM year_plans WHERE guide_id = auth.uid()));
CREATE POLICY year_plan_items_anon_read ON year_plan_items FOR SELECT TO anon USING (true);
