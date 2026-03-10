# Gamification & Rewards System Design

**Date:** 2026-03-09
**Status:** Approved

## Overview

A full gamification system that makes Wayfinder feel like leveling up in a game. Dual currency (EP + Star Tokens), unlockable companions/gear/titles/themes, guide kudos, and soft-competitive leaderboards. Designed for mixed ages (8-18) — collection + progression driven, with opt-in competition.

## 1. Point Economy

### EP (Explorer Points) — Lifetime total, never decreases. Drives rank progression.

| Action | EP | Source |
|---|---|---|
| Complete a project stage | 50 | auto |
| Quality bonus (score-based) | 10-30 | auto |
| Complete full project | 200 | auto |
| Challenger response | 25 | auto |
| Expedition challenge | 15 | auto |
| Reflection submission | 20 | auto |
| Skill tree node complete | 30 | auto |
| Skill tree fully complete | 100 | auto |
| Daily streak bonus | 10/day | auto |
| Guide bonus (manual kudos) | 10-100 | guide |

### Star Tokens (ST) — Spendable currency. Earned alongside EP at a different rate.

| Action | ST | Notes |
|---|---|---|
| Complete a project stage | 5 | bread-and-butter income |
| Complete full project | 25 | big payday |
| Skill tree node | 3 | incentivizes self-directed |
| Skill tree complete | 15 | bonus for finishing |
| Earn a badge | 10 | one-time per badge |
| Rank up | 20 | one-time per rank |
| 7-day streak | 10 | weekly streak reward |
| Guide bonus | 5-50 | guide discretion |

### Existing Ranks (unchanged)

| Rank | Min EP |
|---|---|
| Apprentice | 0 |
| Scout | 200 |
| Pathfinder | 600 |
| Trailblazer | 1,500 |
| Navigator | 3,000 |
| Expedition Leader | 6,000 |

### Existing Badges (10 seeded, unchanged)

first_expedition, deep_diver, devils_advocate, cartographer, streak_explorer, trailblazer, navigator, stage_master, wordsmith, expedition_leader

## 2. Unlockables & Shop

### Companions (hero feature)

Creatures that appear on student profile + immersive 3D world. 12-15 companions across 3 rarity tiers.

| Rarity | ST Cost | Count | Examples |
|---|---|---|---|
| Common | 5 | 5-6 | Trail Mouse, River Frog, Spark Beetle |
| Rare | 25 | 4-5 | Storm Hawk, Crystal Fox, Lava Salamander |
| Legendary | 50 | 3-4 | Golden Owl, Shadow Wolf, Celestial Stag |

- Some are **shop-only** (buy with ST)
- Some are **milestone-only** (e.g., Golden Owl = reach Navigator rank, can't buy it)
- Student picks one **active companion** that shows on profile and in immersive world
- Each has: name, emoji icon, short personality blurb, rarity color

### Gear (mid-tier collectibles)

Profile flair items displayed on student profile as a visual collection grid.

- ~20 items: backpack pins, map tools, explorer patches
- All purchasable with ST (3-15 ST range)
- Categories: Pins, Tools, Patches

### Titles (milestone-only)

Text displayed under student name on profile.

- Earned via badges only (not purchasable) — earning a badge unlocks its corresponding title
- Student picks one **active title**
- Examples: "The Cartographer", "Streak Master", "Deep Diver", "Expedition Leader"

### Profile Themes

Color scheme applied to student profile page.

- 6-8 themes purchasable with ST (10 ST each)
- Default theme free
- Examples: "Midnight Explorer" (dark blue), "Golden Hour" (warm gold), "Deep Ocean" (teal), "Forest Path" (green), "Volcanic" (red/orange), "Arctic" (ice blue)

## 3. Guide Dashboard

### Student Pulse (Dashboard)

- Top 5 EP earners this week shown in the existing Student Pulse card
- Small EP + rank badge next to each student name

### StudentsPage

- EP column + rank badge next to each student name
- Sortable by EP

### StudentProfilePage (guide view)

- Full EP history timeline
- Badges earned grid
- Current collection (active companion, title, gear count)

### Give Kudos

- Button on StudentsPage per student row
- Modal: pick EP amount (10-100 slider), ST amount (5-50 slider), type a reason
- Creates `guide_kudos` record + awards EP and ST
- Shows in student's activity feed and explorer log

### Leaderboard Toggle

- In school settings or guide settings page
- Toggle: show/hide weekly leaderboard on StudentHome for their school
- Default: enabled

## 4. Student Views

### StudentHome Enhancements

- **Profile card**: active companion emoji, active title, rank badge, EP bar, ST balance (with star icon), current streak
- **"Explorer Shop" button**: navigates to /student/shop
- **"My Collection" button**: navigates to /student/collection
- **Weekly Leaderboard**: "This Week's Top Explorers" — top 5 by EP earned in last 7 days. Only shown if guide has it enabled. Shows rank badge + companion emoji + EP earned this week.

### Shop Page (`/student/shop`)

- Grid layout with tabs: Companions | Gear | Themes
- Each item card: emoji/icon, name, rarity badge (companions), ST cost, "Buy" button
- Owned items show "Owned" badge instead of buy button
- Milestone-locked items show lock icon + requirement text (e.g., "Reach Navigator rank")
- ST balance displayed in header

### Collection Page (`/student/collection`)

- All owned items organized by category
- Tap to set as active (companion, title, theme)
- Active items have gold border / checkmark
- Unowned items shown grayed with "?" — encourages collecting

## 5. Database Schema

### New Tables

```sql
-- Spendable currency balance
CREATE TABLE student_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id)
);

-- Token transaction log
CREATE TABLE token_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- positive = earn, negative = spend
  event_type TEXT NOT NULL, -- 'earn_stage', 'earn_project', 'earn_badge', 'earn_rankup', 'earn_streak', 'earn_kudos', 'spend_shop'
  description TEXT,
  item_slug TEXT, -- references reward_items.slug for purchases
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Reward catalog (companions, gear, titles, themes)
CREATE TABLE reward_items (
  slug TEXT PRIMARY KEY, -- e.g., 'companion_golden_owl'
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('companion', 'gear', 'title', 'theme')),
  rarity TEXT CHECK (rarity IN ('common', 'rare', 'legendary')),
  icon TEXT, -- emoji or lucide icon name
  st_cost INTEGER, -- null = milestone-only (not purchasable)
  milestone_type TEXT, -- null = shop-only; 'rank', 'badge', 'streak', 'projects_completed', etc.
  milestone_value TEXT, -- e.g., 'navigator', 'deep_diver', '7', '10'
  theme_config JSONB, -- for themes: { primary, secondary, accent, background }
  sort_order INTEGER DEFAULT 0
);

-- Student inventory (owned items + active selections)
CREATE TABLE student_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  item_slug TEXT NOT NULL REFERENCES reward_items(slug) ON DELETE CASCADE,
  acquired_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT false,
  UNIQUE(student_id, item_slug)
);

-- Guide kudos (manual rewards)
CREATE TABLE guide_kudos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  ep_amount INTEGER NOT NULL DEFAULT 0,
  st_amount INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Indexes

```sql
CREATE INDEX idx_token_events_student ON token_events(student_id);
CREATE INDEX idx_student_inventory_student ON student_inventory(student_id);
CREATE INDEX idx_guide_kudos_student ON guide_kudos(student_id);
CREATE INDEX idx_reward_items_category ON reward_items(category);
```

### RPC Functions

- `award_tokens(p_student_id, p_amount, p_event_type, p_description, p_item_slug)` — awards ST, updates balance + total_earned
- `spend_tokens(p_student_id, p_amount, p_item_slug)` — deducts ST, inserts token_event, inserts student_inventory row. Fails if insufficient balance.
- `get_weekly_leaderboard(p_school_id, p_limit)` — returns top N students by EP earned in last 7 days

### Seeded Data

~35-40 reward items seeded in migration:
- 12-15 companions (mix of shop-only and milestone-only)
- ~20 gear items (all shop-only)
- 10 titles (all milestone-only, tied to badges)
- 6-8 themes (all shop-only)

## 6. EP Award Points for Skill Trees (new)

Currently ExploreSkillPage awards no EP. Add:

- **Node complete**: +30 EP, +3 ST (in `handleCompleteNode`)
- **Tree complete**: +100 EP, +15 ST (in `handleTreeCompletion`)

## 7. Guide Kudos Flow

1. Guide clicks star/gift icon on StudentsPage next to a student
2. Modal opens: EP slider (10-100), ST slider (5-50), reason textarea
3. On submit: insert `guide_kudos`, call `award_xp()`, call `award_tokens()`
4. Student sees toast on next page load: "+X EP, +Y ST from [Guide Name]: [reason]"
5. Entry appears in explorer_log

## 8. Implementation Priority

1. **Migration + seeded data** — new tables, RPC functions, reward item catalog
2. **API layer** — tokens, rewardItems, inventory, kudos, leaderboard functions
3. **Award ST alongside EP** — wire token awards into all existing EP award points + skill trees
4. **Student Shop + Collection pages** — new routes, buy/equip flow
5. **StudentHome enhancements** — profile card, ST balance, leaderboard, shop/collection buttons
6. **Guide views** — StudentsPage EP column, kudos button, StudentProfilePage rewards section
7. **Active companion in immersive world** — render companion emoji/model near hotspots
