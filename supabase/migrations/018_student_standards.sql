-- ============================================================
-- 018: Per-Learner Standards Profiles
-- Each student gets their own standards (core/recommended/supplementary)
-- sourced from school defaults, parent input, AI, or guide decisions
-- ============================================================

CREATE TABLE IF NOT EXISTS student_standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  standard_code TEXT NOT NULL,
  standard_label TEXT NOT NULL,
  standard_description TEXT NOT NULL,
  subject TEXT,
  grade_band TEXT,
  source TEXT NOT NULL DEFAULT 'school'
    CHECK (source IN ('school','parent','guide','ai')),
  priority TEXT NOT NULL DEFAULT 'core'
    CHECK (priority IN ('core','recommended','supplementary')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','completed','skipped')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, standard_code)
);

CREATE INDEX IF NOT EXISTS idx_student_standards_student ON student_standards(student_id);
CREATE INDEX IF NOT EXISTS idx_student_standards_student_status ON student_standards(student_id, status);

-- RLS policies
ALTER TABLE student_standards ENABLE ROW LEVEL SECURITY;

-- Guides can manage standards for their students
CREATE POLICY "Guides manage student standards"
  ON student_standards FOR ALL
  USING (
    student_id IN (
      SELECT id FROM students WHERE guide_id = auth.uid()
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT id FROM students WHERE guide_id = auth.uid()
    )
  );

-- Anon read for student/parent views
CREATE POLICY "Anon read student standards"
  ON student_standards FOR SELECT
  USING (true);

-- Parent standards priorities on parent_access
ALTER TABLE parent_access
  ADD COLUMN IF NOT EXISTS standards_priorities JSONB DEFAULT '{}';
