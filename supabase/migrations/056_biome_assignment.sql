-- ============================================================
-- 056: add biome_id + character_image_url to quests
-- ============================================================
-- The illustrated/tactile world upgrade renders each quest inside a
-- biome (campsite | lab | workshop) chosen at QuestBuilder publish
-- time, and shows a per-project AI-generated character portrait at
-- the firepit/lab-partner/mentor hotspot.
--
-- Both columns are nullable on existing rows. Quests without a
-- biome_id fall back to the suggester at render time. Quests
-- without a character_image_url fall back to <FieldFigure>.

BEGIN;

ALTER TABLE quests
  ADD COLUMN IF NOT EXISTS biome_id TEXT
    CHECK (biome_id IS NULL OR biome_id IN ('campsite', 'lab', 'workshop')),
  ADD COLUMN IF NOT EXISTS character_image_url TEXT;

COMMENT ON COLUMN quests.biome_id IS
  'Hand-illustrated world the learner enters for this quest. Null = suggest at render time.';
COMMENT ON COLUMN quests.character_image_url IS
  'AI-generated character portrait (firepit friend / lab partner / workshop mentor). Null = fall back to procedural FieldFigure.';

COMMIT;
