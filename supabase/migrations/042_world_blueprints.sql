-- 042_world_blueprints.sql
-- Add world blueprint JSONB to quests table + hero journey beat mapping to stages

ALTER TABLE quests ADD COLUMN IF NOT EXISTS world_blueprint JSONB;

ALTER TABLE quest_stages ADD COLUMN IF NOT EXISTS hero_journey_beat TEXT;
ALTER TABLE quest_stages ADD COLUMN IF NOT EXISTS location_name TEXT;
ALTER TABLE quest_stages ADD COLUMN IF NOT EXISTS location_narrative TEXT;

CREATE INDEX IF NOT EXISTS idx_quests_world_blueprint ON quests USING GIN (world_blueprint);

COMMENT ON COLUMN quests.world_blueprint IS 'AI-generated world blueprint: {setting, atmosphere, palette, ambientAudio, mentor, challenger, tone}';
COMMENT ON COLUMN quest_stages.hero_journey_beat IS 'Hero Journey beat: call_to_adventure, crossing_threshold, tests_allies, the_ordeal, the_reward, the_return';
COMMENT ON COLUMN quest_stages.location_name IS 'In-world location name for this stage, e.g. "The Deep Wall"';
COMMENT ON COLUMN quest_stages.location_narrative IS 'Narrative text when student arrives at this location';
