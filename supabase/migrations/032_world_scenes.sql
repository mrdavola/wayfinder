-- 032_world_scenes.sql
-- Add immersive 3D world scene columns to quests

ALTER TABLE quests ADD COLUMN IF NOT EXISTS world_scene_url TEXT;
ALTER TABLE quests ADD COLUMN IF NOT EXISTS world_hotspots JSONB DEFAULT '[]';
ALTER TABLE quests ADD COLUMN IF NOT EXISTS world_scene_prompt TEXT;
