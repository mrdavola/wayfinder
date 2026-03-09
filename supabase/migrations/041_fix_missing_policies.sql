-- 041_fix_missing_policies.sql
-- Safe re-run of policies from 027 + 028 that failed due to duplicates.
-- Uses DO blocks to skip if already exists.

-- ============================================================
-- 027: expedition_challenges
-- ============================================================
ALTER TABLE expedition_challenges ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY expedition_challenges_read ON expedition_challenges FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY expedition_challenges_anon_insert ON expedition_challenges FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY expedition_challenges_auth_manage ON expedition_challenges FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 027: skill_assessments
-- ============================================================
ALTER TABLE skill_assessments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY skill_assessments_guide_read ON skill_assessments FOR SELECT TO authenticated
    USING (student_id IN (SELECT id FROM students WHERE guide_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY skill_assessments_anon_read ON skill_assessments FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY skill_assessments_anon_insert ON skill_assessments FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 027: challenge_responses
-- ============================================================
ALTER TABLE challenge_responses ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY challenge_responses_read ON challenge_responses FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY challenge_responses_anon_insert ON challenge_responses FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 028: buddy_pairs
-- ============================================================
ALTER TABLE buddy_pairs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY buddy_pairs_read ON buddy_pairs FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY buddy_pairs_auth_manage ON buddy_pairs FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY buddy_pairs_anon_read ON buddy_pairs FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 028: buddy_messages
-- ============================================================
ALTER TABLE buddy_messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY buddy_messages_read ON buddy_messages FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY buddy_messages_anon_insert ON buddy_messages FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 028: stall_alerts
-- ============================================================
ALTER TABLE stall_alerts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY stall_alerts_auth_manage ON stall_alerts FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY stall_alerts_anon_read ON stall_alerts FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 028: community_projects
-- ============================================================
ALTER TABLE community_projects ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY community_projects_read ON community_projects FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY community_projects_auth_manage ON community_projects FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 028: community_reviews
-- ============================================================
ALTER TABLE community_reviews ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY community_reviews_read ON community_reviews FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY community_reviews_auth_manage ON community_reviews FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 028: RPC get_inactive_students
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
