-- 028_layer4_community.sql
-- Layer 4: Accountability Buddies, Community Repository

-- ============================================================
-- BUDDY PAIRS — accountability partner assignments
-- ============================================================
CREATE TABLE IF NOT EXISTS buddy_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_a_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_b_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_a_id, student_b_id)
);

CREATE INDEX IF NOT EXISTS idx_buddy_pairs_students ON buddy_pairs(student_a_id, student_b_id);

-- ============================================================
-- BUDDY MESSAGES — encouragement between partners
-- ============================================================
CREATE TABLE IF NOT EXISTS buddy_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id UUID NOT NULL REFERENCES buddy_pairs(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- STALL ALERTS — guide notifications for inactive students
-- ============================================================
CREATE TABLE IF NOT EXISTS stall_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  days_inactive INTEGER NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'flagged_parent')),
  parent_flagged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stall_alerts_guide ON stall_alerts(guide_id, status);

-- ============================================================
-- COMMUNITY PROJECTS — shared completed projects
-- ============================================================
CREATE TABLE IF NOT EXISTS community_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tags JSONB DEFAULT '[]',
  grade_band TEXT,
  project_mode TEXT DEFAULT 'mixed',
  career_pathway TEXT,
  avg_rating NUMERIC(2,1) DEFAULT 0,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_projects_school ON community_projects(school_id);

-- ============================================================
-- COMMUNITY REVIEWS — ratings and comments on shared projects
-- ============================================================
CREATE TABLE IF NOT EXISTS community_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_project_id UUID NOT NULL REFERENCES community_projects(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(community_project_id, reviewer_id)
);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE buddy_pairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY buddy_pairs_read ON buddy_pairs FOR SELECT USING (true);
CREATE POLICY buddy_pairs_auth_manage ON buddy_pairs FOR ALL TO authenticated USING (true);
CREATE POLICY buddy_pairs_anon_read ON buddy_pairs FOR SELECT TO anon USING (true);

ALTER TABLE buddy_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY buddy_messages_read ON buddy_messages FOR SELECT USING (true);
CREATE POLICY buddy_messages_anon_insert ON buddy_messages FOR INSERT TO anon WITH CHECK (true);

ALTER TABLE stall_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY stall_alerts_auth_manage ON stall_alerts FOR ALL TO authenticated USING (true);
CREATE POLICY stall_alerts_anon_read ON stall_alerts FOR SELECT TO anon USING (true);

ALTER TABLE community_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY community_projects_read ON community_projects FOR SELECT USING (true);
CREATE POLICY community_projects_auth_manage ON community_projects FOR ALL TO authenticated USING (true);

ALTER TABLE community_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY community_reviews_read ON community_reviews FOR SELECT USING (true);
CREATE POLICY community_reviews_auth_manage ON community_reviews FOR ALL TO authenticated USING (true);

-- ============================================================
-- RPC: Get inactive students for a guide
-- ============================================================
CREATE OR REPLACE FUNCTION get_inactive_students(
  p_guide_id UUID,
  p_days_threshold INTEGER DEFAULT 3
) RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  avatar_emoji TEXT,
  days_inactive INTEGER,
  last_active DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS student_id,
    s.name AS student_name,
    s.avatar_emoji,
    COALESCE(CURRENT_DATE - sx.last_active_date, 999) AS days_inactive,
    sx.last_active_date AS last_active
  FROM students s
  LEFT JOIN student_xp sx ON sx.student_id = s.id
  WHERE s.guide_id = p_guide_id
    AND (sx.last_active_date IS NULL OR CURRENT_DATE - sx.last_active_date >= p_days_threshold)
  ORDER BY days_inactive DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
