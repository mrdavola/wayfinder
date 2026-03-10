# Gamification & Rewards System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dual-currency (EP + Star Tokens) gamification system with unlockable companions, gear, titles, themes, a student shop/collection, guide kudos, and weekly leaderboard.

**Architecture:** New Supabase tables (student_tokens, token_events, reward_items, student_inventory, guide_kudos) + RPC functions. API layer in `src/lib/api.js`. Two new student pages (Shop, Collection). Enhancements to StudentHome, StudentsPage, StudentProfilePage, Settings. All ST awards wired alongside existing EP awards.

**Tech Stack:** React, Supabase (PostgreSQL + RPC), CSS custom properties, lucide-react icons.

**Design Doc:** `docs/plans/2026-03-09-gamification-rewards-design.md`

---

## Existing System Reference

| File | What's there |
|---|---|
| `supabase/migrations/023_xp_badges.sql` | xp_events, student_xp, badges, student_badges, explorer_log, award_xp() RPC |
| `src/lib/api.js` lines 2341–2564 | `xp`, `badgesApi`, `explorerLog` exports, `EP_VALUES` constant |
| `src/components/xp/` | XPBar, ExplorerRankBadge, XPToast, BadgeGrid components |
| `src/pages/student/StudentQuestPage.jsx` | Only page that awards EP and renders XP UI |
| `src/pages/student/StudentHome.jsx` | No EP/rank display currently |
| `src/pages/student/ExploreSkillPage.jsx` | handleCompleteNode (line 205), handleTreeCompletion (line 248) — no XP awarded |
| `src/pages/StudentsPage.jsx` | Guide student list — no EP column |
| `src/pages/StudentProfilePage.jsx` | Guide student view — no XP/badge display |
| `src/pages/Settings.jsx` | School tab (line 631–711) — no leaderboard toggle |
| `src/App.jsx` | All routes — no shop/collection routes |

---

## Task 1: Database Migration — Tables, RPC Functions, Seed Data

**Files:**
- Create: `supabase/migrations/024_gamification_rewards.sql`

**Step 1: Write the migration file**

Create `supabase/migrations/024_gamification_rewards.sql` with the following content:

```sql
-- ============================================================
-- 024: Gamification & Rewards System
-- Star Tokens currency, reward catalog, inventory, guide kudos
-- ============================================================

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
  v_result JSONB;
  v_new_balance INTEGER;
  v_new_total INTEGER;
BEGIN
  -- Upsert student_tokens row
  INSERT INTO student_tokens (student_id, balance, total_earned)
  VALUES (p_student_id, p_amount, p_amount)
  ON CONFLICT (student_id) DO UPDATE
  SET balance = student_tokens.balance + p_amount,
      total_earned = student_tokens.total_earned + p_amount,
      updated_at = now()
  RETURNING balance, total_earned INTO v_new_balance, v_new_total;

  -- Insert transaction log
  INSERT INTO token_events (student_id, amount, event_type, description, item_slug)
  VALUES (p_student_id, p_amount, p_event_type, p_description, p_item_slug);

  v_result := jsonb_build_object(
    'balance', v_new_balance,
    'total_earned', v_new_total
  );

  RETURN v_result;
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
  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM student_tokens
  WHERE student_id = p_student_id;

  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RETURN jsonb_build_object('error', 'Insufficient balance', 'balance', COALESCE(v_current_balance, 0));
  END IF;

  -- Deduct balance
  UPDATE student_tokens
  SET balance = balance - p_amount, updated_at = now()
  WHERE student_id = p_student_id
  RETURNING balance INTO v_new_balance;

  -- Log the spend
  INSERT INTO token_events (student_id, amount, event_type, description, item_slug)
  VALUES (p_student_id, -p_amount, 'spend_shop', 'Purchased ' || p_item_slug, p_item_slug);

  -- Add to inventory
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

-- Companions — Legendary (milestone-only, not purchasable)
INSERT INTO reward_items (slug, name, description, category, rarity, icon, st_cost, milestone_type, milestone_value, sort_order) VALUES
  ('companion_golden_owl', 'Golden Owl', 'Ancient keeper of knowledge. Only appears to true Navigators.', 'companion', 'legendary', '🦉', NULL, 'rank', 'navigator', 10),
  ('companion_shadow_wolf', 'Shadow Wolf', 'A lone leader who guides others through the dark.', 'companion', 'legendary', '🐺', NULL, 'rank', 'expedition_leader', 11),
  ('companion_celestial_stag', 'Celestial Stag', 'Born from starlight. Only the most dedicated explorers earn its trust.', 'companion', 'legendary', '🦌', NULL, 'badge', 'trailblazer', 12)
ON CONFLICT (slug) DO NOTHING;

-- Gear — Pins (shop-only)
INSERT INTO reward_items (slug, name, description, category, rarity, icon, st_cost, sort_order) VALUES
  ('gear_compass_pin', 'Compass Pin', 'Always points toward your next goal.', 'gear', NULL, '🧭', 3, 20),
  ('gear_star_pin', 'Star Pin', 'Earned your first star.', 'gear', NULL, '⭐', 3, 21),
  ('gear_lightning_pin', 'Lightning Pin', 'Quick thinker award.', 'gear', NULL, '⚡', 5, 22),
  ('gear_mountain_pin', 'Mountain Pin', 'Climbed a big challenge.', 'gear', NULL, '🏔️', 5, 23),
  ('gear_rocket_pin', 'Rocket Pin', 'Blasting through projects.', 'gear', NULL, '🚀', 5, 24),
  ('gear_diamond_pin', 'Diamond Pin', 'Unbreakable dedication.', 'gear', NULL, '💎', 8, 25),
  ('gear_fire_pin', 'Fire Pin', 'On a hot streak.', 'gear', NULL, '🔥', 8, 26)
ON CONFLICT (slug) DO NOTHING;

-- Gear — Tools (shop-only)
INSERT INTO reward_items (slug, name, description, category, rarity, icon, st_cost, sort_order) VALUES
  ('gear_magnifying_glass', 'Magnifying Glass', 'See the details others miss.', 'gear', NULL, '🔍', 5, 30),
  ('gear_field_journal', 'Field Journal', 'Every explorer needs one.', 'gear', NULL, '📓', 5, 31),
  ('gear_telescope', 'Telescope', 'See what lies ahead.', 'gear', NULL, '🔭', 8, 32),
  ('gear_lantern', 'Explorer Lantern', 'Lights up the unknown.', 'gear', NULL, '🏮', 8, 33),
  ('gear_grappling_hook', 'Grappling Hook', 'Reach higher places.', 'gear', NULL, '🪝', 10, 34),
  ('gear_treasure_map', 'Treasure Map', 'X marks the spot.', 'gear', NULL, '🗺️', 10, 35),
  ('gear_golden_key', 'Golden Key', 'Opens doors to new worlds.', 'gear', NULL, '🔑', 15, 36)
ON CONFLICT (slug) DO NOTHING;

-- Gear — Patches (shop-only)
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
```

**Step 2: Run the migration**

Run this SQL in the Supabase dashboard SQL Editor (or local Supabase CLI if available).

**Step 3: Commit**

```bash
git add supabase/migrations/024_gamification_rewards.sql
git commit -m "feat: add gamification rewards migration — tokens, rewards catalog, inventory, kudos, leaderboard"
```

---

## Task 2: API Layer — Tokens, Rewards, Inventory, Kudos, Leaderboard

**Files:**
- Modify: `src/lib/api.js`

**Context:** The file is large. All new exports go after the existing `explorerLog` export (around line 2564). The existing pattern uses `supabase.from(table)` for CRUD and `supabase.rpc(name, params)` for RPC calls.

**Step 1: Add ST_VALUES constant and tokens API**

Add after the existing `EP_VALUES` constant (around line 2352 in api.js):

```javascript
const ST_VALUES = {
  stage_complete: 5,
  project_complete: 25,
  skill_node: 3,
  skill_tree: 15,
  badge_earned: 10,
  rank_up: 20,
  streak_7day: 10,
};
```

**Step 2: Add all new API exports**

Add after the `explorerLog` export object (around line 2564):

```javascript
// ── Star Tokens ──────────────────────────────────────────
export const tokens = {
  async getBalance(studentId) {
    const { data } = await supabase
      .from('student_tokens')
      .select('balance, total_earned')
      .eq('student_id', studentId)
      .single();
    return data || { balance: 0, total_earned: 0 };
  },

  async award(studentId, amount, eventType, description = null, itemSlug = null) {
    const { data, error } = await supabase.rpc('award_tokens', {
      p_student_id: studentId,
      p_amount: amount,
      p_event_type: eventType,
      p_description: description,
      p_item_slug: itemSlug,
    });
    if (error) throw error;
    return data;
  },

  async spend(studentId, amount, itemSlug) {
    const { data, error } = await supabase.rpc('spend_tokens', {
      p_student_id: studentId,
      p_amount: amount,
      p_item_slug: itemSlug,
    });
    if (error) throw error;
    return data;
  },

  async getHistory(studentId, limit = 20) {
    const { data } = await supabase
      .from('token_events')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return data || [];
  },
};

// ── Reward Items Catalog ─────────────────────────────────
export const rewardItems = {
  async getAll() {
    const { data } = await supabase
      .from('reward_items')
      .select('*')
      .order('sort_order');
    return data || [];
  },

  async getByCategory(category) {
    const { data } = await supabase
      .from('reward_items')
      .select('*')
      .eq('category', category)
      .order('sort_order');
    return data || [];
  },
};

// ── Student Inventory ────────────────────────────────────
export const inventory = {
  async getForStudent(studentId) {
    const { data } = await supabase
      .from('student_inventory')
      .select('*, reward_items(*)')
      .eq('student_id', studentId)
      .order('acquired_at', { ascending: false });
    return data || [];
  },

  async setActive(studentId, itemSlug, category) {
    // Deactivate all items in category for this student
    const { data: categoryItems } = await supabase
      .from('student_inventory')
      .select('id, item_slug, reward_items(category)')
      .eq('student_id', studentId);

    const idsToDeactivate = (categoryItems || [])
      .filter(i => i.reward_items?.category === category)
      .map(i => i.id);

    if (idsToDeactivate.length > 0) {
      await supabase
        .from('student_inventory')
        .update({ is_active: false })
        .in('id', idsToDeactivate);
    }

    // Activate the selected item
    await supabase
      .from('student_inventory')
      .update({ is_active: true })
      .eq('student_id', studentId)
      .eq('item_slug', itemSlug);
  },

  async getActiveItems(studentId) {
    const { data } = await supabase
      .from('student_inventory')
      .select('*, reward_items(*)')
      .eq('student_id', studentId)
      .eq('is_active', true);
    return data || [];
  },

  async buyItem(studentId, itemSlug, stCost) {
    // spend_tokens RPC handles balance check, deduction, and inventory insert
    return tokens.spend(studentId, stCost, itemSlug);
  },

  async checkMilestoneUnlocks(studentId, currentRank, earnedBadgeSlugs) {
    // Get all milestone-based items
    const { data: milestoneItems } = await supabase
      .from('reward_items')
      .select('*')
      .not('milestone_type', 'is', null);

    // Get already-owned items
    const { data: owned } = await supabase
      .from('student_inventory')
      .select('item_slug')
      .eq('student_id', studentId);
    const ownedSlugs = new Set((owned || []).map(i => i.item_slug));

    const rankOrder = ['apprentice', 'scout', 'pathfinder', 'trailblazer', 'navigator', 'expedition_leader'];
    const currentRankIdx = rankOrder.indexOf(currentRank);
    const newUnlocks = [];

    for (const item of (milestoneItems || [])) {
      if (ownedSlugs.has(item.slug)) continue;

      let unlocked = false;
      if (item.milestone_type === 'rank') {
        const requiredIdx = rankOrder.indexOf(item.milestone_value);
        unlocked = currentRankIdx >= requiredIdx;
      } else if (item.milestone_type === 'badge') {
        unlocked = earnedBadgeSlugs.includes(item.milestone_value);
      }

      if (unlocked) {
        await supabase
          .from('student_inventory')
          .insert({ student_id: studentId, item_slug: item.slug })
          .select()
          .single();
        newUnlocks.push(item);
      }
    }

    return newUnlocks;
  },
};

// ── Guide Kudos ──────────────────────────────────────────
export const kudos = {
  async give(guideId, studentId, epAmount, stAmount, reason) {
    // Insert kudos record
    const { data, error } = await supabase
      .from('guide_kudos')
      .insert({ guide_id: guideId, student_id: studentId, ep_amount: epAmount, st_amount: stAmount, reason })
      .select()
      .single();
    if (error) throw error;

    // Award EP
    if (epAmount > 0) {
      await supabase.rpc('award_xp', {
        p_student_id: studentId,
        p_event_type: 'peer_help', // reuse existing type for guide kudos
        p_points: epAmount,
        p_metadata: { source: 'guide_kudos', reason },
      });
    }

    // Award ST
    if (stAmount > 0) {
      await tokens.award(studentId, stAmount, 'earn_kudos', `Kudos from guide: ${reason}`);
    }

    // Add to explorer log
    await explorerLog.add(studentId, 'badge_earned', `Received kudos: "${reason}" (+${epAmount} EP, +${stAmount} ST)`);

    return data;
  },

  async getForStudent(studentId, limit = 20) {
    const { data } = await supabase
      .from('guide_kudos')
      .select('*, profiles(display_name)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return data || [];
  },
};

// ── Leaderboard ──────────────────────────────────────────
export const leaderboard = {
  async getWeekly(schoolId, limit = 5) {
    const { data, error } = await supabase.rpc('get_weekly_leaderboard', {
      p_school_id: schoolId,
      p_limit: limit,
    });
    if (error) throw error;
    return data || [];
  },
};
```

**Step 3: Export ST_VALUES**

Add `ST_VALUES` to be accessible:

```javascript
// Near the EP_VALUES export, add:
export { ST_VALUES };
```

And make sure EP_VALUES is also exported if not already.

**Step 4: Commit**

```bash
git add src/lib/api.js
git commit -m "feat: add API layer for tokens, rewards, inventory, kudos, leaderboard"
```

---

## Task 3: Wire ST Awards Into All Existing EP Award Points

**Files:**
- Modify: `src/pages/student/StudentQuestPage.jsx`
- Modify: `src/pages/student/ExploreSkillPage.jsx`

**Context:** StudentQuestPage already awards EP in several places. We need to also award ST at each point. ExploreSkillPage currently awards NO EP — we need to add both EP and ST for skill node + tree completion.

### Step 1: Add ST awards in StudentQuestPage

Import `tokens` and `ST_VALUES` at the top of the file:

```javascript
import { tokens, ST_VALUES } from '../../lib/api';
```

Then find each `xp.award()` call and add a corresponding `tokens.award()` call after it. Also check for milestone unlocks after rank-ups and badge awards.

**Award points to wire:**

| Location | EP Event | ST to add |
|---|---|---|
| Stage complete | `xp.award(..., 'stage_complete')` | `tokens.award(studentId, ST_VALUES.stage_complete, 'earn_stage', 'Completed stage')` |
| Project complete | `xp.award(..., 'project_complete')` | `tokens.award(studentId, ST_VALUES.project_complete, 'earn_project', 'Completed project')` |
| Challenger response | `xp.award(..., 'challenger_response')` | No ST for this (design doc doesn't include it) |
| Badge earned (in checkAndAward result) | `badgesApi.checkAndAward()` | `tokens.award(studentId, ST_VALUES.badge_earned, 'earn_badge', 'Earned badge: ...')` per new badge |
| Rank up (from xp.award result) | award_xp returns `rank_changed` | `tokens.award(studentId, ST_VALUES.rank_up, 'earn_rankup', 'Ranked up to ...')` |

After awarding ST for badge/rank, also call `inventory.checkMilestoneUnlocks()` to auto-unlock milestone items.

### Step 2: Add EP + ST awards in ExploreSkillPage

Import required:

```javascript
import { xp, tokens, ST_VALUES, badgesApi, inventory } from '../../lib/api';
```

In `handleCompleteNode` (around line 205), after marking node complete:

```javascript
// Award EP + ST for node completion
if (studentProfile?.id) {
  await xp.award(studentProfile.id, 'stage_complete', null, node.id);
  await tokens.award(studentProfile.id, ST_VALUES.skill_node, 'earn_skill_node', `Completed skill node: ${node.label}`);
}
```

Note: We reuse `stage_complete` event type for skill nodes since EP_VALUES.stage_complete = 50 is too high. We should add a specific EP value. Actually, the design says 30 EP for skill node. So either:
- Add a new event type to the `xp_events` CHECK constraint, OR
- Use the `peer_help` type (15 EP) which is close but not exact, OR
- Call `supabase.rpc('award_xp')` directly with 30 points

Best approach: Call `award_xp` RPC directly with 30 points and use `'peer_help'` event type (since we can't easily alter the CHECK constraint from frontend). OR better: add `'skill_node'` and `'skill_tree'` to the migration's xp_events CHECK constraint.

**Add to migration (Task 1):** Alter the xp_events CHECK constraint to include `'skill_node'` and `'skill_tree'`:

```sql
-- In migration 024, add:
ALTER TABLE xp_events DROP CONSTRAINT IF EXISTS xp_events_event_type_check;
ALTER TABLE xp_events ADD CONSTRAINT xp_events_event_type_check
  CHECK (event_type IN ('stage_complete', 'quality_bonus', 'challenger_response', 'reflection', 'peer_help', 'project_complete', 'streak_bonus', 'skill_node', 'skill_tree'));
```

Then in ExploreSkillPage:

```javascript
// In handleCompleteNode, after node marked complete:
if (studentProfile?.id) {
  await supabase.rpc('award_xp', {
    p_student_id: studentProfile.id,
    p_event_type: 'skill_node',
    p_points: 30,
  });
  await tokens.award(studentProfile.id, ST_VALUES.skill_node, 'earn_skill_node', `Completed skill node: ${node.label}`);
}
```

In `handleTreeCompletion` (around line 248), after marking exploration complete:

```javascript
// Award EP + ST for tree completion
if (studentProfile?.id) {
  await supabase.rpc('award_xp', {
    p_student_id: studentProfile.id,
    p_event_type: 'skill_tree',
    p_points: 100,
  });
  await tokens.award(studentProfile.id, ST_VALUES.skill_tree, 'earn_skill_tree', `Completed skill tree: ${exploration.topic}`);
  const newBadges = await badgesApi.checkAndAward(studentProfile.id);
  // Award ST for any new badges
  for (const badge of newBadges) {
    await tokens.award(studentProfile.id, ST_VALUES.badge_earned, 'earn_badge', `Earned badge: ${badge.name}`);
  }
}
```

### Step 3: Commit

```bash
git add src/pages/student/StudentQuestPage.jsx src/pages/student/ExploreSkillPage.jsx
git commit -m "feat: wire Star Token awards alongside EP at all award points"
```

---

## Task 4: STTokenBadge + STToast Components

**Files:**
- Create: `src/components/xp/STBadge.jsx`

**Step 1: Create the ST display component**

A small pill that shows the star token balance, and a toast variant for award notifications.

```jsx
import { Star } from 'lucide-react';

export function STBadge({ balance, size = 'md' }) {
  const sizes = {
    sm: { fontSize: '0.75rem', padding: '2px 8px', iconSize: 12 },
    md: { fontSize: '0.875rem', padding: '4px 10px', iconSize: 14 },
    lg: { fontSize: '1rem', padding: '6px 12px', iconSize: 16 },
  };
  const s = sizes[size] || sizes.md;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
      color: '#78350f', borderRadius: 20, padding: s.padding,
      fontSize: s.fontSize, fontWeight: 700, fontFamily: 'var(--font-mono)',
      whiteSpace: 'nowrap',
    }}>
      <Star size={s.iconSize} fill="#78350f" />
      {balance ?? 0}
    </span>
  );
}
```

### Step 2: Commit

```bash
git add src/components/xp/STBadge.jsx
git commit -m "feat: add STBadge component for Star Token display"
```

---

## Task 5: Student Shop Page

**Files:**
- Create: `src/pages/student/ShopPage.jsx`
- Create: `src/pages/student/ShopPage.css`
- Modify: `src/App.jsx` (add route)

### Step 1: Create ShopPage.css

Styles for the shop grid, item cards, tabs, and purchase flow.

```css
.shop-page { max-width: 900px; margin: 0 auto; padding: 24px 16px; }
.shop-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.shop-header h1 { font-family: var(--font-display); font-size: 1.75rem; color: var(--ink); }
.shop-tabs { display: flex; gap: 8px; margin-bottom: 24px; }
.shop-tab {
  padding: 8px 16px; border-radius: 20px; border: 1.5px solid var(--pencil);
  background: var(--paper); color: var(--graphite); cursor: pointer;
  font-family: var(--font-body); font-size: 0.875rem; font-weight: 500;
  transition: all 0.2s;
}
.shop-tab:hover { border-color: var(--compass-gold); }
.shop-tab.active { background: var(--compass-gold); color: #78350f; border-color: var(--compass-gold); }
.shop-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.shop-card {
  background: var(--paper); border: 1.5px solid var(--pencil); border-radius: 12px;
  padding: 16px; text-align: center; transition: all 0.2s; position: relative;
}
.shop-card:hover { border-color: var(--compass-gold); box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.shop-card.owned { opacity: 0.7; }
.shop-card.locked { opacity: 0.5; }
.shop-card-icon { font-size: 2.5rem; margin-bottom: 8px; }
.shop-card-name { font-family: var(--font-display); font-size: 1rem; color: var(--ink); margin-bottom: 4px; }
.shop-card-desc { font-size: 0.75rem; color: var(--graphite); margin-bottom: 12px; line-height: 1.4; }
.shop-card-rarity {
  display: inline-block; padding: 2px 8px; border-radius: 10px;
  font-size: 0.65rem; font-weight: 700; text-transform: uppercase; margin-bottom: 8px;
}
.rarity-common { background: #e5e7eb; color: #374151; }
.rarity-rare { background: #dbeafe; color: #1d4ed8; }
.rarity-legendary { background: #fef3c7; color: #92400e; }
.shop-buy-btn {
  padding: 6px 16px; border-radius: 20px; border: none; cursor: pointer;
  font-weight: 600; font-size: 0.8rem; transition: all 0.2s;
  background: var(--compass-gold); color: #78350f;
}
.shop-buy-btn:hover { filter: brightness(1.1); }
.shop-buy-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.shop-owned-badge {
  padding: 6px 16px; border-radius: 20px; font-weight: 600; font-size: 0.8rem;
  background: var(--field-green); color: white; display: inline-block;
}
.shop-locked-badge {
  padding: 6px 16px; border-radius: 20px; font-weight: 600; font-size: 0.75rem;
  background: var(--pencil); color: var(--graphite); display: inline-flex;
  align-items: center; gap: 4px;
}
```

### Step 2: Create ShopPage.jsx

```jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Star } from 'lucide-react';
import { rewardItems, inventory, tokens } from '../../lib/api';
import { STBadge } from '../../components/xp/STBadge';
import './ShopPage.css';

const TABS = [
  { key: 'companion', label: 'Companions' },
  { key: 'gear', label: 'Gear' },
  { key: 'theme', label: 'Themes' },
];

export default function ShopPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('companion');
  const [items, setItems] = useState([]);
  const [ownedSlugs, setOwnedSlugs] = useState(new Set());
  const [balance, setBalance] = useState(0);
  const [buying, setBuying] = useState(null);
  const studentProfile = JSON.parse(sessionStorage.getItem('student_profile') || 'null');

  useEffect(() => {
    if (!studentProfile?.id) return;
    loadData();
  }, []);

  async function loadData() {
    const [allItems, inv, bal] = await Promise.all([
      rewardItems.getAll(),
      inventory.getForStudent(studentProfile.id),
      tokens.getBalance(studentProfile.id),
    ]);
    setItems(allItems);
    setOwnedSlugs(new Set(inv.map(i => i.item_slug)));
    setBalance(bal.balance);
  }

  const filtered = items.filter(i => i.category === tab);

  async function handleBuy(item) {
    if (buying || ownedSlugs.has(item.slug)) return;
    if (balance < item.st_cost) return;
    setBuying(item.slug);
    try {
      const result = await inventory.buyItem(studentProfile.id, item.slug, item.st_cost);
      if (result.error) {
        alert(result.error);
        return;
      }
      setBalance(result.balance);
      setOwnedSlugs(prev => new Set([...prev, item.slug]));
    } catch (err) {
      console.error('Purchase failed:', err);
    } finally {
      setBuying(null);
    }
  }

  if (!studentProfile) {
    return <div className="shop-page"><p>Please sign in as a student first.</p></div>;
  }

  return (
    <div className="shop-page">
      <div className="shop-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/student')} className="btn btn-ghost" style={{ padding: 6 }}>
            <ArrowLeft size={20} />
          </button>
          <h1>Explorer Shop</h1>
        </div>
        <STBadge balance={balance} size="lg" />
      </div>

      <div className="shop-tabs">
        {TABS.map(t => (
          <button key={t.key} className={`shop-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="shop-grid">
        {filtered.map(item => {
          const owned = ownedSlugs.has(item.slug);
          const locked = !item.st_cost && item.milestone_type;
          const tooExpensive = item.st_cost && balance < item.st_cost;

          return (
            <div key={item.slug} className={`shop-card ${owned ? 'owned' : ''} ${locked ? 'locked' : ''}`}>
              <div className="shop-card-icon">{item.icon}</div>
              <div className="shop-card-name">{item.name}</div>
              {item.rarity && (
                <span className={`shop-card-rarity rarity-${item.rarity}`}>{item.rarity}</span>
              )}
              <div className="shop-card-desc">{item.description}</div>

              {owned ? (
                <span className="shop-owned-badge">Owned ✓</span>
              ) : locked ? (
                <span className="shop-locked-badge">
                  <Lock size={12} />
                  {item.milestone_type === 'rank' ? `Reach ${item.milestone_value}` : `Earn ${item.milestone_value} badge`}
                </span>
              ) : (
                <button
                  className="shop-buy-btn"
                  onClick={() => handleBuy(item)}
                  disabled={tooExpensive || buying === item.slug}
                >
                  <Star size={12} fill="#78350f" style={{ marginRight: 4, verticalAlign: -1 }} />
                  {buying === item.slug ? '...' : item.st_cost}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### Step 3: Add route in App.jsx

Find the student routes section and add:

```jsx
<Route path="/student/shop" element={<ShopPage />} />
```

Import at top with other lazy imports:

```javascript
const ShopPage = lazy(() => import('./pages/student/ShopPage'));
```

### Step 4: Commit

```bash
git add src/pages/student/ShopPage.jsx src/pages/student/ShopPage.css src/App.jsx
git commit -m "feat: add Explorer Shop page with buy flow"
```

---

## Task 6: Student Collection Page

**Files:**
- Create: `src/pages/student/CollectionPage.jsx`
- Create: `src/pages/student/CollectionPage.css`
- Modify: `src/App.jsx` (add route)

### Step 1: Create CollectionPage.css

```css
.collection-page { max-width: 900px; margin: 0 auto; padding: 24px 16px; }
.collection-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.collection-header h1 { font-family: var(--font-display); font-size: 1.75rem; color: var(--ink); }
.collection-section { margin-bottom: 32px; }
.collection-section h2 { font-family: var(--font-display); font-size: 1.25rem; color: var(--ink); margin-bottom: 16px; }
.collection-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
.collection-item {
  background: var(--paper); border: 1.5px solid var(--pencil); border-radius: 12px;
  padding: 12px; text-align: center; cursor: pointer; transition: all 0.2s;
  position: relative;
}
.collection-item:hover { border-color: var(--compass-gold); }
.collection-item.active { border-color: var(--compass-gold); border-width: 2px; box-shadow: 0 0 0 2px rgba(212,165,116,0.3); }
.collection-item.unowned { opacity: 0.3; cursor: default; }
.collection-item-icon { font-size: 2rem; margin-bottom: 4px; }
.collection-item-name { font-size: 0.8rem; font-weight: 600; color: var(--ink); }
.collection-active-check {
  position: absolute; top: 6px; right: 6px;
  background: var(--compass-gold); color: #78350f; border-radius: 50%;
  width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;
  font-size: 0.7rem; font-weight: 700;
}
.collection-item.unowned .collection-item-icon { filter: grayscale(1); }
```

### Step 2: Create CollectionPage.jsx

```jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { rewardItems, inventory } from '../../lib/api';
import './CollectionPage.css';

const CATEGORIES = [
  { key: 'companion', label: 'Companions' },
  { key: 'gear', label: 'Gear' },
  { key: 'title', label: 'Titles' },
  { key: 'theme', label: 'Themes' },
];

export default function CollectionPage() {
  const navigate = useNavigate();
  const [allItems, setAllItems] = useState([]);
  const [ownedMap, setOwnedMap] = useState({});
  const [activeSlugs, setActiveSlugs] = useState(new Set());
  const studentProfile = JSON.parse(sessionStorage.getItem('student_profile') || 'null');

  useEffect(() => {
    if (!studentProfile?.id) return;
    loadData();
  }, []);

  async function loadData() {
    const [items, inv] = await Promise.all([
      rewardItems.getAll(),
      inventory.getForStudent(studentProfile.id),
    ]);
    setAllItems(items);
    const owned = {};
    const active = new Set();
    for (const i of inv) {
      owned[i.item_slug] = true;
      if (i.is_active) active.add(i.item_slug);
    }
    setOwnedMap(owned);
    setActiveSlugs(active);
  }

  async function handleSetActive(item) {
    if (!ownedMap[item.slug]) return;
    await inventory.setActive(studentProfile.id, item.slug, item.category);
    // Update local state
    const newActive = new Set(activeSlugs);
    // Remove any active item in same category
    allItems.filter(i => i.category === item.category).forEach(i => newActive.delete(i.slug));
    newActive.add(item.slug);
    setActiveSlugs(newActive);
  }

  if (!studentProfile) {
    return <div className="collection-page"><p>Please sign in as a student first.</p></div>;
  }

  return (
    <div className="collection-page">
      <div className="collection-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/student')} className="btn btn-ghost" style={{ padding: 6 }}>
            <ArrowLeft size={20} />
          </button>
          <h1>My Collection</h1>
        </div>
        <span style={{ fontSize: '0.875rem', color: 'var(--graphite)' }}>
          {Object.keys(ownedMap).length} / {allItems.length} collected
        </span>
      </div>

      {CATEGORIES.map(cat => {
        const catItems = allItems.filter(i => i.category === cat.key);
        if (catItems.length === 0) return null;

        return (
          <div key={cat.key} className="collection-section">
            <h2>{cat.label}</h2>
            <div className="collection-grid">
              {catItems.map(item => {
                const owned = ownedMap[item.slug];
                const active = activeSlugs.has(item.slug);

                return (
                  <div
                    key={item.slug}
                    className={`collection-item ${owned ? '' : 'unowned'} ${active ? 'active' : ''}`}
                    onClick={() => owned && handleSetActive(item)}
                    title={owned ? `Click to equip ${item.name}` : item.name}
                  >
                    {active && <div className="collection-active-check"><Check size={12} /></div>}
                    <div className="collection-item-icon">{owned ? item.icon : '?'}</div>
                    <div className="collection-item-name">{owned ? item.name : '???'}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

### Step 3: Add route in App.jsx

```jsx
const CollectionPage = lazy(() => import('./pages/student/CollectionPage'));
// ...
<Route path="/student/collection" element={<CollectionPage />} />
```

### Step 4: Commit

```bash
git add src/pages/student/CollectionPage.jsx src/pages/student/CollectionPage.css src/App.jsx
git commit -m "feat: add Collection page — view owned items, equip active companion/title/theme"
```

---

## Task 7: StudentHome Enhancements

**Files:**
- Modify: `src/pages/student/StudentHome.jsx`

**What to add:**
1. Profile card: active companion emoji, active title, rank badge, EP bar, ST balance, current streak
2. "Explorer Shop" and "My Collection" buttons
3. Weekly Leaderboard section

### Step 1: Add imports

```javascript
import { xp, tokens, inventory, leaderboard } from '../../lib/api';
import { ExplorerRankBadge } from '../../components/xp/ExplorerRankBadge';
import { XPBar } from '../../components/xp/XPBar';
import { STBadge } from '../../components/xp/STBadge';
import { ShoppingBag, Trophy, Flame } from 'lucide-react';
```

### Step 2: Add state + data loading

In the component, add state:

```javascript
const [xpData, setXpData] = useState(null);
const [stBalance, setStBalance] = useState(0);
const [activeItems, setActiveItems] = useState([]);
const [leaderboardData, setLeaderboardData] = useState([]);
```

In the existing useEffect that loads data (or create new one):

```javascript
// Load gamification data
if (studentProfile?.id) {
  xp.getStudentXP(studentProfile.id).then(setXpData);
  tokens.getBalance(studentProfile.id).then(d => setStBalance(d.balance));
  inventory.getActiveItems(studentProfile.id).then(setActiveItems);
  if (studentProfile.school_id) {
    leaderboard.getWeekly(studentProfile.school_id).then(setLeaderboardData);
  }
}
```

### Step 3: Add Profile Card section

Insert after the top bar / hero section, before the CTA buttons:

```jsx
{/* Explorer Profile Card */}
{xpData && (
  <div style={{
    background: 'var(--paper)', border: '1.5px solid var(--pencil)',
    borderRadius: 16, padding: 20, marginBottom: 24,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      {/* Active companion */}
      {activeItems.find(i => i.reward_items?.category === 'companion') && (
        <span style={{ fontSize: '1.5rem' }}>
          {activeItems.find(i => i.reward_items?.category === 'companion').reward_items.icon}
        </span>
      )}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ExplorerRankBadge rank={xpData.current_rank} size="sm" />
          <STBadge balance={stBalance} size="sm" />
          {xpData.current_streak > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 2,
              fontSize: '0.75rem', color: 'var(--specimen-red)', fontWeight: 600,
            }}>
              <Flame size={14} /> {xpData.current_streak}d
            </span>
          )}
        </div>
        {/* Active title */}
        {activeItems.find(i => i.reward_items?.category === 'title') && (
          <div style={{ fontSize: '0.75rem', color: 'var(--graphite)', fontStyle: 'italic', marginTop: 2 }}>
            {activeItems.find(i => i.reward_items?.category === 'title').reward_items.name}
          </div>
        )}
      </div>
    </div>
    <XPBar currentXP={xpData.total_points} rank={xpData.current_rank} />
  </div>
)}

{/* Shop + Collection buttons */}
<div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
  <button onClick={() => navigate('/student/shop')} className="btn btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
    <ShoppingBag size={16} /> Explorer Shop
  </button>
  <button onClick={() => navigate('/student/collection')} className="btn btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
    <Trophy size={16} /> My Collection
  </button>
</div>
```

### Step 4: Add Weekly Leaderboard section

Insert before the Explorer Log section:

```jsx
{/* Weekly Leaderboard */}
{leaderboardData.length > 0 && (
  <div style={{
    background: 'var(--paper)', border: '1.5px solid var(--pencil)',
    borderRadius: 16, padding: 20, marginBottom: 24,
  }}>
    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', marginBottom: 12 }}>
      This Week's Top Explorers
    </h3>
    {leaderboardData.map((entry, i) => (
      <div key={entry.student_id} style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0',
        borderBottom: i < leaderboardData.length - 1 ? '1px solid var(--pencil)' : 'none',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.875rem',
          color: i === 0 ? 'var(--compass-gold)' : 'var(--graphite)', minWidth: 24,
        }}>
          #{i + 1}
        </span>
        <span style={{ fontSize: '1.25rem' }}>{entry.student_emoji || '🧭'}</span>
        <span style={{ flex: 1, fontWeight: 500 }}>{entry.student_name}</span>
        <ExplorerRankBadge rank={entry.current_rank} size="sm" />
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.8rem', color: 'var(--field-green)' }}>
          +{entry.ep_this_week} EP
        </span>
      </div>
    ))}
  </div>
)}
```

### Step 5: Commit

```bash
git add src/pages/student/StudentHome.jsx
git commit -m "feat: add explorer profile card, shop/collection buttons, weekly leaderboard to StudentHome"
```

---

## Task 8: Guide Kudos Modal + StudentsPage EP Column

**Files:**
- Create: `src/components/guide/KudosModal.jsx`
- Modify: `src/pages/StudentsPage.jsx`

### Step 1: Create KudosModal.jsx

```jsx
import { useState } from 'react';
import { X, Star, Zap } from 'lucide-react';
import { kudos } from '../../lib/api';

export default function KudosModal({ student, guideId, onClose, onSuccess }) {
  const [epAmount, setEpAmount] = useState(25);
  const [stAmount, setStAmount] = useState(10);
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!reason.trim()) return;
    setSending(true);
    try {
      await kudos.give(guideId, student.id, epAmount, stAmount, reason.trim());
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Kudos failed:', err);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--paper)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400,
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>
            Give Kudos to {student.name}
          </h3>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', fontWeight: 600, marginBottom: 6 }}>
            <Zap size={14} /> EP Amount: {epAmount}
          </label>
          <input type="range" min={10} max={100} step={5} value={epAmount}
            onChange={e => setEpAmount(Number(e.target.value))}
            style={{ width: '100%' }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', fontWeight: 600, marginBottom: 6 }}>
            <Star size={14} fill="#f59e0b" /> Star Tokens: {stAmount}
          </label>
          <input type="range" min={5} max={50} step={5} value={stAmount}
            onChange={e => setStAmount(Number(e.target.value))}
            style={{ width: '100%' }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>Reason</label>
          <textarea
            className="input"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Great work on your research project!"
            rows={3}
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>

        <button
          className="btn btn-primary"
          onClick={handleSend}
          disabled={sending || !reason.trim()}
          style={{ width: '100%' }}
        >
          {sending ? 'Sending...' : `Send Kudos (+${epAmount} EP, +${stAmount} ST)`}
        </button>
      </div>
    </div>
  );
}
```

### Step 2: Modify StudentsPage.jsx

Add imports:

```javascript
import { xp } from '../lib/api';
import { ExplorerRankBadge } from '../components/xp/ExplorerRankBadge';
import { Gift } from 'lucide-react';
import KudosModal from '../components/guide/KudosModal';
```

Add state for XP data and kudos modal:

```javascript
const [studentXpMap, setStudentXpMap] = useState({});
const [kudosTarget, setKudosTarget] = useState(null);
```

Load XP data for all students after students load:

```javascript
// In the useEffect that loads students, after students are fetched:
for (const s of students) {
  xp.getStudentXP(s.id).then(data => {
    setStudentXpMap(prev => ({ ...prev, [s.id]: data }));
  });
}
```

In each student ViewRow, add EP + rank badge after the name:

```jsx
{/* After student name */}
{studentXpMap[student.id] && (
  <>
    <ExplorerRankBadge rank={studentXpMap[student.id].current_rank} size="sm" />
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--graphite)' }}>
      {studentXpMap[student.id].total_points} EP
    </span>
  </>
)}

{/* Kudos button in the action buttons area */}
<button onClick={() => setKudosTarget(student)} className="btn btn-ghost" title="Give Kudos" style={{ padding: 4 }}>
  <Gift size={16} />
</button>
```

At the bottom of the component, render the modal:

```jsx
{kudosTarget && (
  <KudosModal
    student={kudosTarget}
    guideId={profile.id}
    onClose={() => setKudosTarget(null)}
    onSuccess={() => {
      // Refresh XP for that student
      xp.getStudentXP(kudosTarget.id).then(data => {
        setStudentXpMap(prev => ({ ...prev, [kudosTarget.id]: data }));
      });
    }}
  />
)}
```

### Step 3: Commit

```bash
git add src/components/guide/KudosModal.jsx src/pages/StudentsPage.jsx
git commit -m "feat: add Guide Kudos modal + EP/rank column on StudentsPage"
```

---

## Task 9: StudentProfilePage Rewards Section

**Files:**
- Modify: `src/pages/StudentProfilePage.jsx`

### Step 1: Add rewards data loading

Add imports:

```javascript
import { xp, tokens, badgesApi, inventory, kudos as kudosApi } from '../lib/api';
import { ExplorerRankBadge } from '../components/xp/ExplorerRankBadge';
import { XPBar } from '../components/xp/XPBar';
import { STBadge } from '../components/xp/STBadge';
import BadgeGrid from '../components/xp/BadgeGrid';
```

Add state:

```javascript
const [xpData, setXpData] = useState(null);
const [stData, setStData] = useState({ balance: 0, total_earned: 0 });
const [allBadges, setAllBadges] = useState([]);
const [earnedBadges, setEarnedBadges] = useState([]);
const [activeItems, setActiveItems] = useState([]);
const [kudosHistory, setKudosHistory] = useState([]);
```

Load in useEffect after student data loads:

```javascript
// Load gamification data
xp.getStudentXP(studentId).then(setXpData);
tokens.getBalance(studentId).then(setStData);
badgesApi.getAll().then(setAllBadges);
badgesApi.getStudentBadges(studentId).then(setEarnedBadges);
inventory.getActiveItems(studentId).then(setActiveItems);
kudosApi.getForStudent(studentId).then(setKudosHistory);
```

### Step 2: Add rewards section to the profile

Add a section (best placed after existing skill sections) showing:

```jsx
{/* Explorer Progress */}
{xpData && (
  <div className="card" style={{ padding: 20, marginBottom: 24 }}>
    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginBottom: 16 }}>
      Explorer Progress
    </h3>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <ExplorerRankBadge rank={xpData.current_rank} />
      <STBadge balance={stData.balance} />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--graphite)' }}>
        {xpData.total_points} EP total
      </span>
    </div>
    <XPBar currentXP={xpData.total_points} rank={xpData.current_rank} />

    {/* Active companion + title */}
    <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: '0.875rem', color: 'var(--graphite)' }}>
      {activeItems.find(i => i.reward_items?.category === 'companion') && (
        <span>
          Companion: {activeItems.find(i => i.reward_items?.category === 'companion').reward_items.icon}{' '}
          {activeItems.find(i => i.reward_items?.category === 'companion').reward_items.name}
        </span>
      )}
      {activeItems.find(i => i.reward_items?.category === 'title') && (
        <span>Title: {activeItems.find(i => i.reward_items?.category === 'title').reward_items.name}</span>
      )}
    </div>
  </div>
)}

{/* Badges */}
{allBadges.length > 0 && (
  <div className="card" style={{ padding: 20, marginBottom: 24 }}>
    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginBottom: 16 }}>
      Badges ({earnedBadges.length} / {allBadges.length})
    </h3>
    <BadgeGrid allBadges={allBadges} earnedBadges={earnedBadges} />
  </div>
)}

{/* Recent Kudos */}
{kudosHistory.length > 0 && (
  <div className="card" style={{ padding: 20, marginBottom: 24 }}>
    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginBottom: 16 }}>
      Recent Kudos
    </h3>
    {kudosHistory.slice(0, 5).map(k => (
      <div key={k.id} style={{
        padding: '8px 0', borderBottom: '1px solid var(--pencil)',
        fontSize: '0.875rem',
      }}>
        <span style={{ fontWeight: 600 }}>{k.profiles?.display_name || 'Guide'}</span>
        {' — '}
        <span style={{ color: 'var(--graphite)' }}>{k.reason}</span>
        <span style={{ float: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
          +{k.ep_amount} EP, +{k.st_amount} ST
        </span>
      </div>
    ))}
  </div>
)}
```

### Step 3: Commit

```bash
git add src/pages/StudentProfilePage.jsx
git commit -m "feat: add explorer progress, badges, and kudos history to StudentProfilePage"
```

---

## Task 10: Leaderboard Toggle in Settings

**Files:**
- Modify: `src/pages/Settings.jsx`

### Step 1: Add leaderboard toggle to School tab

In the School settings section, add a toggle for `enable_leaderboard`. Find the School tab content and add after existing fields:

```jsx
<div style={{ marginTop: 16 }}>
  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
    <input
      type="checkbox"
      checked={school.enable_leaderboard ?? true}
      onChange={e => setSchool(prev => ({ ...prev, enable_leaderboard: e.target.checked }))}
    />
    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Show weekly leaderboard on student home</span>
  </label>
  <p style={{ fontSize: '0.75rem', color: 'var(--graphite)', marginTop: 4, marginLeft: 24 }}>
    When enabled, students see a "This Week's Top Explorers" section on their home page.
  </p>
</div>
```

Make sure `saveSchool()` includes the `enable_leaderboard` field in its update call.

### Step 2: Update StudentHome leaderboard to check toggle

In StudentHome, the leaderboard section should check if leaderboard is enabled. When loading student data, also fetch the school's `enable_leaderboard` setting:

```javascript
const [showLeaderboard, setShowLeaderboard] = useState(true);

// In data loading:
if (studentProfile?.school_id) {
  supabase.from('schools').select('enable_leaderboard').eq('id', studentProfile.school_id).single()
    .then(({ data }) => {
      if (data) setShowLeaderboard(data.enable_leaderboard !== false);
    });
}
```

Then wrap the leaderboard section: `{showLeaderboard && leaderboardData.length > 0 && (...)}`.

### Step 3: Commit

```bash
git add src/pages/Settings.jsx src/pages/student/StudentHome.jsx
git commit -m "feat: add leaderboard toggle in school settings"
```

---

## Summary

| Task | Description | Files |
|---|---|---|
| 1 | DB migration + seed data | `supabase/migrations/024_gamification_rewards.sql` |
| 2 | API layer (tokens, rewards, inventory, kudos, leaderboard) | `src/lib/api.js` |
| 3 | Wire ST awards alongside EP at all existing award points | `StudentQuestPage.jsx`, `ExploreSkillPage.jsx` |
| 4 | STBadge component | `src/components/xp/STBadge.jsx` |
| 5 | Student Shop page | `ShopPage.jsx`, `ShopPage.css`, `App.jsx` |
| 6 | Student Collection page | `CollectionPage.jsx`, `CollectionPage.css`, `App.jsx` |
| 7 | StudentHome enhancements (profile card, leaderboard, buttons) | `StudentHome.jsx` |
| 8 | Guide Kudos modal + StudentsPage EP column | `KudosModal.jsx`, `StudentsPage.jsx` |
| 9 | StudentProfilePage rewards section | `StudentProfilePage.jsx` |
| 10 | Leaderboard toggle in Settings | `Settings.jsx`, `StudentHome.jsx` |

**Estimated commits:** 10
