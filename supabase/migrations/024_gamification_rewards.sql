-- ============================================================
-- 024: Gamification & Rewards System
-- Star Tokens currency, reward catalog, inventory, guide kudos
-- ============================================================

-- Update xp_events CHECK to include skill_node and skill_tree
ALTER TABLE xp_events DROP CONSTRAINT IF EXISTS xp_events_event_type_check;
ALTER TABLE xp_events ADD CONSTRAINT xp_events_event_type_check
  CHECK (event_type IN ('stage_complete', 'quality_bonus', 'challenger_response', 'reflection', 'peer_help', 'project_complete', 'streak_bonus', 'skill_node', 'skill_tree'));

-- 1. Spendable currency balance (one row per student)
CREATE TABLE IF NOT EXISTS student_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id)
);

ALTER TABLE student_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read student_tokens" ON student_tokens FOR SELECT USING (true);
CREATE POLICY "Anyone can insert student_tokens" ON student_tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update student_tokens" ON student_tokens FOR UPDATE USING (true);

-- 2. Token transaction log
CREATE TABLE IF NOT EXISTS token_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'earn_stage', 'earn_project', 'earn_skill_node', 'earn_skill_tree',
    'earn_badge', 'earn_rankup', 'earn_streak', 'earn_kudos',
    'spend_shop'
  )),
  description TEXT,
  item_slug TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE token_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read token_events" ON token_events FOR SELECT USING (true);
CREATE POLICY "Anyone can insert token_events" ON token_events FOR INSERT WITH CHECK (true);

CREATE INDEX idx_token_events_student ON token_events(student_id);
CREATE INDEX idx_token_events_student_created ON token_events(student_id, created_at);

-- 3. Reward catalog (companions, gear, titles, themes)
CREATE TABLE IF NOT EXISTS reward_items (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('companion', 'gear', 'title', 'theme')),
  rarity TEXT CHECK (rarity IN ('common', 'rare', 'legendary')),
  icon TEXT,
  st_cost INTEGER,
  milestone_type TEXT,
  milestone_value TEXT,
  theme_config JSONB,
  sort_order INTEGER DEFAULT 0
);

ALTER TABLE reward_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read reward_items" ON reward_items FOR SELECT USING (true);

-- 4. Student inventory (owned items + active selections)
CREATE TABLE IF NOT EXISTS student_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  item_slug TEXT NOT NULL REFERENCES reward_items(slug) ON DELETE CASCADE,
  acquired_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT false,
  UNIQUE(student_id, item_slug)
);

ALTER TABLE student_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read student_inventory" ON student_inventory FOR SELECT USING (true);
CREATE POLICY "Anyone can insert student_inventory" ON student_inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update student_inventory" ON student_inventory FOR UPDATE USING (true);

CREATE INDEX idx_student_inventory_student ON student_inventory(student_id);

-- 5. Guide kudos
CREATE TABLE IF NOT EXISTS guide_kudos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  ep_amount INTEGER NOT NULL DEFAULT 0,
  st_amount INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE guide_kudos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read guide_kudos" ON guide_kudos FOR SELECT USING (true);
CREATE POLICY "Anyone can insert guide_kudos" ON guide_kudos FOR INSERT WITH CHECK (true);

CREATE INDEX idx_guide_kudos_student ON guide_kudos(student_id);

-- 6. Leaderboard toggle on schools
ALTER TABLE schools ADD COLUMN IF NOT EXISTS enable_leaderboard BOOLEAN DEFAULT true;

-- ============================================================
-- RPC: award_tokens
-- ============================================================
CREATE OR REPLACE FUNCTION award_tokens(
  p_student_id UUID,
  p_amount INTEGER,
  p_event_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_item_slug TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_balance INTEGER;
  v_new_total INTEGER;
BEGIN
  INSERT INTO student_tokens (student_id, balance, total_earned)
  VALUES (p_student_id, p_amount, p_amount)
  ON CONFLICT (student_id) DO UPDATE
  SET balance = student_tokens.balance + p_amount,
      total_earned = student_tokens.total_earned + p_amount,
      updated_at = now()
  RETURNING balance, total_earned INTO v_new_balance, v_new_total;

  INSERT INTO token_events (student_id, amount, event_type, description, item_slug)
  VALUES (p_student_id, p_amount, p_event_type, p_description, p_item_slug);

  RETURN jsonb_build_object('balance', v_new_balance, 'total_earned', v_new_total);
END;
$$;

-- ============================================================
-- RPC: spend_tokens
-- ============================================================
CREATE OR REPLACE FUNCTION spend_tokens(
  p_student_id UUID,
  p_amount INTEGER,
  p_item_slug TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  SELECT balance INTO v_current_balance
  FROM student_tokens
  WHERE student_id = p_student_id;

  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RETURN jsonb_build_object('error', 'Insufficient balance', 'balance', COALESCE(v_current_balance, 0));
  END IF;

  UPDATE student_tokens
  SET balance = balance - p_amount, updated_at = now()
  WHERE student_id = p_student_id
  RETURNING balance INTO v_new_balance;

  INSERT INTO token_events (student_id, amount, event_type, description, item_slug)
  VALUES (p_student_id, -p_amount, 'spend_shop', 'Purchased ' || p_item_slug, p_item_slug);

  INSERT INTO student_inventory (student_id, item_slug)
  VALUES (p_student_id, p_item_slug)
  ON CONFLICT (student_id, item_slug) DO NOTHING;

  RETURN jsonb_build_object('balance', v_new_balance, 'item_slug', p_item_slug);
END;
$$;

-- ============================================================
-- RPC: get_weekly_leaderboard
-- ============================================================
CREATE OR REPLACE FUNCTION get_weekly_leaderboard(
  p_school_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  student_emoji TEXT,
  ep_this_week INTEGER,
  total_ep INTEGER,
  current_rank TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS student_id,
    s.name AS student_name,
    s.emoji AS student_emoji,
    COALESCE(SUM(xe.points)::INTEGER, 0) AS ep_this_week,
    COALESCE(sx.total_points, 0)::INTEGER AS total_ep,
    COALESCE(sx.current_rank, 'apprentice') AS current_rank
  FROM students s
  LEFT JOIN xp_events xe ON xe.student_id = s.id
    AND xe.created_at >= now() - interval '7 days'
  LEFT JOIN student_xp sx ON sx.student_id = s.id
  WHERE s.school_id = p_school_id
  GROUP BY s.id, s.name, s.emoji, sx.total_points, sx.current_rank
  ORDER BY ep_this_week DESC
  LIMIT p_limit;
END;
$$;

-- ============================================================
-- SEED: Reward Items
-- ============================================================

-- Companions — Common (shop-only)
INSERT INTO reward_items (slug, name, description, category, rarity, icon, st_cost, sort_order) VALUES
  ('companion_trail_mouse', 'Trail Mouse', 'A curious little explorer who loves cheese and shortcuts.', 'companion', 'common', '🐭', 5, 1),
  ('companion_river_frog', 'River Frog', 'Croaks encouragement at every milestone.', 'companion', 'common', '🐸', 5, 2),
  ('companion_spark_beetle', 'Spark Beetle', 'Glows brighter the more you learn.', 'companion', 'common', '⚡', 5, 3),
  ('companion_cloud_bunny', 'Cloud Bunny', 'Hops between ideas and always lands on its feet.', 'companion', 'common', '🐰', 5, 4),
  ('companion_moss_turtle', 'Moss Turtle', 'Slow and steady — carries wisdom on its back.', 'companion', 'common', '🐢', 5, 5)
ON CONFLICT (slug) DO NOTHING;

-- Companions — Rare (shop-only)
INSERT INTO reward_items (slug, name, description, category, rarity, icon, st_cost, sort_order) VALUES
  ('companion_storm_hawk', 'Storm Hawk', 'Sees the big picture from above the clouds.', 'companion', 'rare', '🦅', 25, 6),
  ('companion_crystal_fox', 'Crystal Fox', 'Sharp mind, sharper instincts.', 'companion', 'rare', '🦊', 25, 7),
  ('companion_lava_salamander', 'Lava Salamander', 'Thrives under pressure and never burns out.', 'companion', 'rare', '🦎', 25, 8),
  ('companion_wind_dolphin', 'Wind Dolphin', 'Rides waves of creativity.', 'companion', 'rare', '🐬', 25, 9)
ON CONFLICT (slug) DO NOTHING;

-- Companions — Legendary (milestone-only)
INSERT INTO reward_items (slug, name, description, category, rarity, icon, st_cost, milestone_type, milestone_value, sort_order) VALUES
  ('companion_golden_owl', 'Golden Owl', 'Ancient keeper of knowledge. Only appears to true Navigators.', 'companion', 'legendary', '🦉', NULL, 'rank', 'navigator', 10),
  ('companion_shadow_wolf', 'Shadow Wolf', 'A lone leader who guides others through the dark.', 'companion', 'legendary', '🐺', NULL, 'rank', 'expedition_leader', 11),
  ('companion_celestial_stag', 'Celestial Stag', 'Born from starlight. Only the most dedicated explorers earn its trust.', 'companion', 'legendary', '🦌', NULL, 'badge', 'trailblazer', 12)
ON CONFLICT (slug) DO NOTHING;

-- Gear — Pins
INSERT INTO reward_items (slug, name, description, category, rarity, icon, st_cost, sort_order) VALUES
  ('gear_compass_pin', 'Compass Pin', 'Always points toward your next goal.', 'gear', NULL, '🧭', 3, 20),
  ('gear_star_pin', 'Star Pin', 'Earned your first star.', 'gear', NULL, '⭐', 3, 21),
  ('gear_lightning_pin', 'Lightning Pin', 'Quick thinker award.', 'gear', NULL, '⚡', 5, 22),
  ('gear_mountain_pin', 'Mountain Pin', 'Climbed a big challenge.', 'gear', NULL, '🏔️', 5, 23),
  ('gear_rocket_pin', 'Rocket Pin', 'Blasting through projects.', 'gear', NULL, '🚀', 5, 24),
  ('gear_diamond_pin', 'Diamond Pin', 'Unbreakable dedication.', 'gear', NULL, '💎', 8, 25),
  ('gear_fire_pin', 'Fire Pin', 'On a hot streak.', 'gear', NULL, '🔥', 8, 26)
ON CONFLICT (slug) DO NOTHING;

-- Gear — Tools
INSERT INTO reward_items (slug, name, description, category, rarity, icon, st_cost, sort_order) VALUES
  ('gear_magnifying_glass', 'Magnifying Glass', 'See the details others miss.', 'gear', NULL, '🔍', 5, 30),
  ('gear_field_journal', 'Field Journal', 'Every explorer needs one.', 'gear', NULL, '📓', 5, 31),
  ('gear_telescope', 'Telescope', 'See what lies ahead.', 'gear', NULL, '🔭', 8, 32),
  ('gear_lantern', 'Explorer Lantern', 'Lights up the unknown.', 'gear', NULL, '🏮', 8, 33),
  ('gear_grappling_hook', 'Grappling Hook', 'Reach higher places.', 'gear', NULL, '🪝', 10, 34),
  ('gear_treasure_map', 'Treasure Map', 'X marks the spot.', 'gear', NULL, '🗺️', 10, 35),
  ('gear_golden_key', 'Golden Key', 'Opens doors to new worlds.', 'gear', NULL, '🔑', 15, 36)
ON CONFLICT (slug) DO NOTHING;

-- Gear — Patches
INSERT INTO reward_items (slug, name, description, category, rarity, icon, st_cost, sort_order) VALUES
  ('gear_explorer_patch', 'Explorer Patch', 'Official member of the expedition.', 'gear', NULL, '🏅', 5, 40),
  ('gear_nature_patch', 'Nature Patch', 'One with the wild.', 'gear', NULL, '🌿', 5, 41),
  ('gear_ocean_patch', 'Ocean Patch', 'Deep diver certified.', 'gear', NULL, '🌊', 5, 42),
  ('gear_summit_patch', 'Summit Patch', 'Reached the top.', 'gear', NULL, '🏔️', 8, 43),
  ('gear_star_patch', 'Star Patch', 'Shining bright.', 'gear', NULL, '🌟', 8, 44),
  ('gear_aurora_patch', 'Aurora Patch', 'Rare and beautiful.', 'gear', NULL, '🌌', 12, 45)
ON CONFLICT (slug) DO NOTHING;

-- Titles (milestone-only — tied to badges)
INSERT INTO reward_items (slug, name, description, category, icon, milestone_type, milestone_value, sort_order) VALUES
  ('title_first_expedition', 'First Steps', 'Completed your first project.', 'title', '🥾', 'badge', 'first_expedition', 60),
  ('title_deep_diver', 'The Deep Diver', 'Explored beyond the surface.', 'title', '🤿', 'badge', 'deep_diver', 61),
  ('title_devils_advocate', 'Devil''s Advocate', 'Challenged assumptions fearlessly.', 'title', '😈', 'badge', 'devils_advocate', 62),
  ('title_cartographer', 'The Cartographer', 'Mapped the unknown.', 'title', '🗺️', 'badge', 'cartographer', 63),
  ('title_streak_master', 'Streak Master', 'Consistency is your superpower.', 'title', '🔥', 'badge', 'streak_explorer', 64),
  ('title_trailblazer', 'The Trailblazer', 'Forged new paths for others.', 'title', '🌟', 'badge', 'trailblazer', 65),
  ('title_navigator', 'The Navigator', 'Guides others through the storm.', 'title', '🧭', 'badge', 'navigator', 66),
  ('title_stage_master', 'Stage Master', 'Conquered every stage.', 'title', '🎭', 'badge', 'stage_master', 67),
  ('title_wordsmith', 'The Wordsmith', 'Words are your weapon.', 'title', '✍️', 'badge', 'wordsmith', 68),
  ('title_expedition_leader', 'Expedition Leader', 'The ultimate explorer.', 'title', '👑', 'badge', 'expedition_leader', 69)
ON CONFLICT (slug) DO NOTHING;

-- Themes (shop-only)
INSERT INTO reward_items (slug, name, description, category, icon, st_cost, theme_config, sort_order) VALUES
  ('theme_default', 'Explorer Classic', 'The default Wayfinder look.', 'theme', '🎨', NULL,
   '{"primary":"#1a1a2e","secondary":"#f5f0e8","accent":"#d4a574","background":"#faf8f5"}', 80),
  ('theme_midnight', 'Midnight Explorer', 'Deep blue mysteries await.', 'theme', '🌙', 10,
   '{"primary":"#0d1b2a","secondary":"#1b2838","accent":"#48cae4","background":"#0d1b2a"}', 81),
  ('theme_golden_hour', 'Golden Hour', 'Warm sunlight on the trail.', 'theme', '🌅', 10,
   '{"primary":"#92400e","secondary":"#fef3c7","accent":"#d97706","background":"#fffbeb"}', 82),
  ('theme_deep_ocean', 'Deep Ocean', 'Explore the depths.', 'theme', '🌊', 10,
   '{"primary":"#134e4a","secondary":"#ccfbf1","accent":"#14b8a6","background":"#f0fdfa"}', 83),
  ('theme_forest_path', 'Forest Path', 'Through the emerald canopy.', 'theme', '🌲', 10,
   '{"primary":"#14532d","secondary":"#dcfce7","accent":"#22c55e","background":"#f0fdf4"}', 84),
  ('theme_volcanic', 'Volcanic', 'Fire and ambition.', 'theme', '🌋', 10,
   '{"primary":"#7f1d1d","secondary":"#fef2f2","accent":"#ef4444","background":"#fef2f2"}', 85),
  ('theme_arctic', 'Arctic', 'Cool and focused.', 'theme', '❄️', 10,
   '{"primary":"#1e3a5f","secondary":"#e0f2fe","accent":"#38bdf8","background":"#f0f9ff"}', 86)
ON CONFLICT (slug) DO NOTHING;
