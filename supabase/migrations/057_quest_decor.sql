-- ============================================================
-- 057: quest_decor — AI-generated decorative content per quest
-- ============================================================
-- Each quest has up to ~6 decorative slots (notes pinned to the
-- bulletin, posters on the lab wall, labels on jars). Slots are
-- generated at QuestBuilder publish time using a versioned style
-- prefix; results are cached here so we don't pay generation cost
-- per render or per learner view.
--
-- One row per (quest_id, slot). slot is a free-form short string
-- defined by the biome config (e.g. 'bulletin_note_1', 'wall_poster').

BEGIN;

CREATE TABLE IF NOT EXISTS quest_decor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  slot TEXT NOT NULL,
  image_url TEXT NOT NULL,
  prompt TEXT NOT NULL,
  style_prefix_version TEXT NOT NULL DEFAULT 'v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (quest_id, slot)
);

CREATE INDEX IF NOT EXISTS idx_quest_decor_quest_id ON quest_decor (quest_id);

ALTER TABLE quest_decor ENABLE ROW LEVEL SECURITY;

-- RLS: authenticated users can read decor for any quest they can
-- already see (we rely on the existing quests RLS to gate visibility).
DROP POLICY IF EXISTS quest_decor_read ON quest_decor;
CREATE POLICY quest_decor_read
  ON quest_decor FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quests q
      WHERE q.id = quest_decor.quest_id
    )
  );

-- Inserts go through service role (server-side at QuestBuilder publish).
-- No INSERT/UPDATE/DELETE policy for authenticated => locked down.

COMMENT ON TABLE quest_decor IS
  'AI-generated decorative images per quest, cached at publish time. One row per (quest_id, slot).';

COMMIT;
