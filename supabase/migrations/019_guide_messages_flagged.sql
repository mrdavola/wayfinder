-- ═══════════════════════════════════════════════════════════════════════════════
-- 019: Guide Messages — Flagged Column for Moderation
-- Adds flagged boolean for content safety monitoring
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add flagged column
ALTER TABLE public.guide_messages
  ADD COLUMN IF NOT EXISTS flagged BOOLEAN DEFAULT FALSE;

-- Index for fast flagged lookups
CREATE INDEX IF NOT EXISTS guide_messages_flagged_idx
  ON public.guide_messages(flagged) WHERE flagged = TRUE;

-- Allow guides to update messages (for marking reviewed)
CREATE POLICY "Guides can update guide messages" ON public.guide_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.quests q WHERE q.id = quest_id AND q.guide_id = auth.uid()
    )
  );

-- Allow anon to insert flagged field
-- (anon insert policy already exists from 014, this just ensures flagged column is writable)
