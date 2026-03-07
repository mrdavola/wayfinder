-- 031_fix_skill_snapshots.sql
-- Add missing columns to skill_snapshots and fix RLS for MasteryMap access

-- Add columns that api.js expects
ALTER TABLE skill_snapshots ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'ai';
ALTER TABLE skill_snapshots ADD COLUMN IF NOT EXISTS quest_id UUID REFERENCES quests(id) ON DELETE SET NULL;
ALTER TABLE skill_snapshots ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Add anon read policy so MasteryMap can load from student sessions
CREATE POLICY IF NOT EXISTS skill_snapshots_anon_read
  ON skill_snapshots FOR SELECT TO anon USING (true);

-- Add anon insert policy for student quest pages
CREATE POLICY IF NOT EXISTS skill_snapshots_anon_insert
  ON skill_snapshots FOR INSERT TO anon WITH CHECK (true);
