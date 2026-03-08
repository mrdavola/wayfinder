-- 039_stage_videos.sql
-- Add video_urls JSONB column to quest_stages for embedded videos per stage
-- Each entry: {"title": "Video Title", "url": "https://...", "source": "youtube|vimeo|loom|other", "ai_curated": true|false}

ALTER TABLE quest_stages ADD COLUMN IF NOT EXISTS video_urls JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN quest_stages.video_urls IS 'Embedded video URLs per stage — AI-curated and guide-attached';
