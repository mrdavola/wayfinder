-- Add new stage fields for fun-mode AI generation
ALTER TABLE quest_stages
  ADD COLUMN IF NOT EXISTS challenge TEXT,
  ADD COLUMN IF NOT EXISTS tier INTEGER,
  ADD COLUMN IF NOT EXISTS required_to_advance INTEGER,
  ADD COLUMN IF NOT EXISTS suggested_creation_mode TEXT;
