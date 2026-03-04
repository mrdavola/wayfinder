-- ===================== PROGRESSIVE DIFFICULTY =====================
-- Add stretch challenges and difficulty tiers to quest stages

ALTER TABLE public.quest_stages
  ADD COLUMN IF NOT EXISTS stretch_challenge text,
  ADD COLUMN IF NOT EXISTS difficulty_tier text DEFAULT 'standard';

-- Add check constraint if it doesn't exist
DO $$ BEGIN
  ALTER TABLE public.quest_stages
    ADD CONSTRAINT quest_stages_difficulty_tier_check
    CHECK (difficulty_tier IN ('scaffolded', 'standard', 'stretch'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
