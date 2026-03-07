-- 029_layer5_branching.sql
-- Layer 5: Year Plan v2 (outcome balancing, packages) + Branching Narratives

-- ============================================================
-- YEAR PLAN V2 — outcome domain tracking
-- ============================================================

-- Add domain coverage tracking to year_plan_items
ALTER TABLE year_plan_items ADD COLUMN IF NOT EXISTS domain_coverage JSONB DEFAULT '{}';

-- Year Plan Packages — exportable multi-project bundles
CREATE TABLE IF NOT EXISTS year_plan_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES year_plans(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  grade_band TEXT,
  items_snapshot JSONB NOT NULL DEFAULT '[]',
  target_outcomes JSONB DEFAULT '[]',
  total_weeks INTEGER DEFAULT 0,
  avg_rating NUMERIC(2,1) DEFAULT 0,
  import_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE year_plan_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY year_plan_packages_read ON year_plan_packages FOR SELECT USING (true);
CREATE POLICY year_plan_packages_auth_manage ON year_plan_packages FOR ALL TO authenticated USING (true);

-- ============================================================
-- BRANCHING NARRATIVES — stage tree structure
-- ============================================================

CREATE TABLE IF NOT EXISTS stage_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES quest_stages(id) ON DELETE CASCADE,
  branch_index INTEGER NOT NULL,
  branch_label TEXT NOT NULL,
  branch_description TEXT,
  next_stage_id UUID REFERENCES quest_stages(id) ON DELETE SET NULL,
  narrative_variant TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(stage_id, branch_index)
);

CREATE INDEX IF NOT EXISTS idx_stage_branches_stage ON stage_branches(stage_id);
CREATE INDEX IF NOT EXISTS idx_stage_branches_next ON stage_branches(next_stage_id);

-- Student path choices — which branch each student took
CREATE TABLE IF NOT EXISTS student_stage_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES quest_stages(id) ON DELETE CASCADE,
  chosen_branch_index INTEGER NOT NULL,
  chosen_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, quest_id, stage_id)
);

CREATE INDEX IF NOT EXISTS idx_student_paths_student_quest ON student_stage_paths(student_id, quest_id);

-- Add is_branching flag to quests for easy filtering
ALTER TABLE quests ADD COLUMN IF NOT EXISTS is_branching BOOLEAN DEFAULT false;

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE stage_branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY stage_branches_read ON stage_branches FOR SELECT USING (true);
CREATE POLICY stage_branches_auth_manage ON stage_branches FOR ALL TO authenticated USING (true);
CREATE POLICY stage_branches_anon_insert ON stage_branches FOR INSERT TO anon WITH CHECK (true);

ALTER TABLE student_stage_paths ENABLE ROW LEVEL SECURITY;
CREATE POLICY student_stage_paths_read ON student_stage_paths FOR SELECT USING (true);
CREATE POLICY student_stage_paths_anon_insert ON student_stage_paths FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY student_stage_paths_anon_update ON student_stage_paths FOR UPDATE TO anon USING (true);
