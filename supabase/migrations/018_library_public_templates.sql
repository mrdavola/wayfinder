-- ═══════════════════════════════════════════════════════════════════════════════
-- 018: Library - Public Templates
-- Adds is_public flag and grade_band to quest_templates for community sharing
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add columns
ALTER TABLE public.quest_templates
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS grade_band TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS author_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS use_count INT DEFAULT 0;

-- Index for community queries
CREATE INDEX IF NOT EXISTS quest_templates_public_idx
  ON public.quest_templates(is_public) WHERE is_public = TRUE;

-- RLS: anyone can read public templates
CREATE POLICY "Anyone can read public templates" ON public.quest_templates
  FOR SELECT USING (is_public = TRUE OR guide_id = auth.uid());

-- Allow anon to read public templates (for logged-out browsing)
GRANT SELECT ON public.quest_templates TO anon;
