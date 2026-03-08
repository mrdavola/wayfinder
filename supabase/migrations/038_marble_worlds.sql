-- 038_marble_worlds.sql
-- Add Marble World Labs columns to quests table

ALTER TABLE quests ADD COLUMN IF NOT EXISTS marble_world_url TEXT;
ALTER TABLE quests ADD COLUMN IF NOT EXISTS marble_world_id TEXT;
ALTER TABLE quests ADD COLUMN IF NOT EXISTS marble_operation_id TEXT;
ALTER TABLE quests ADD COLUMN IF NOT EXISTS marble_model TEXT DEFAULT 'Marble 0.1-mini';
ALTER TABLE quests ADD COLUMN IF NOT EXISTS marble_pano_url TEXT;
ALTER TABLE quests ADD COLUMN IF NOT EXISTS marble_thumbnail_url TEXT;

-- Index for polling active operations
CREATE INDEX IF NOT EXISTS idx_quests_marble_operation ON quests(marble_operation_id) WHERE marble_operation_id IS NOT NULL;

COMMENT ON COLUMN quests.marble_world_url IS 'Embeddable Marble viewer URL (iframe src)';
COMMENT ON COLUMN quests.marble_world_id IS 'World Labs world UUID for API lookups';
COMMENT ON COLUMN quests.marble_operation_id IS 'Active generation operation ID (null when complete)';
COMMENT ON COLUMN quests.marble_pano_url IS 'Panorama image from Marble (fallback for Three.js)';
