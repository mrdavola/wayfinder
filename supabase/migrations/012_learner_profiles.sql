-- 012_learner_profiles.sql
-- Learner Profile System: invite links, skill catalog, student skills,
-- AI recommendations, quest groups, parent access scaffolding, mastery scaffolding

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. GUIDE INVITES — shareable invite codes per guide
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS guide_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  school_id   UUID REFERENCES schools(id) ON DELETE SET NULL,
  code        TEXT NOT NULL UNIQUE,
  label       TEXT DEFAULT '',
  max_uses    INT DEFAULT NULL,        -- NULL = unlimited
  use_count   INT DEFAULT 0,
  active      BOOLEAN DEFAULT TRUE,
  expires_at  TIMESTAMPTZ DEFAULT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE guide_invites ENABLE ROW LEVEL SECURITY;

-- Guides can CRUD their own invites
CREATE POLICY "Guides manage own invites"
  ON guide_invites FOR ALL
  USING (guide_id = auth.uid())
  WITH CHECK (guide_id = auth.uid());

-- Anon users can read active invites (for validation)
CREATE POLICY "Anon can read active invites"
  ON guide_invites FOR SELECT
  USING (active = TRUE);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. SKILLS — master skill catalog
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS skills (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  category    TEXT NOT NULL CHECK (category IN ('core', 'soft', 'interest')),
  description TEXT DEFAULT '',
  icon        TEXT DEFAULT '',
  standards   TEXT[] DEFAULT '{}',     -- mapped academic standards
  grade_bands TEXT[] DEFAULT '{K-2,3-5,6-8,9-12}',
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

-- Everyone can read skills catalog
CREATE POLICY "Anyone can read skills"
  ON skills FOR SELECT
  USING (TRUE);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. STUDENT SKILLS — per-student skill tracking
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS student_skills (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  skill_id      UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  proficiency   TEXT NOT NULL DEFAULT 'emerging'
                CHECK (proficiency IN ('emerging', 'developing', 'proficient', 'advanced')),
  source        TEXT NOT NULL DEFAULT 'self'
                CHECK (source IN ('self', 'guide', 'ai', 'quest')),
  notes         TEXT DEFAULT '',
  updated_at    TIMESTAMPTZ DEFAULT now(),
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, skill_id)
);

ALTER TABLE student_skills ENABLE ROW LEVEL SECURITY;

-- Guides can manage skills for their students
CREATE POLICY "Guides manage student skills"
  ON student_skills FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_skills.student_id
        AND s.guide_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_skills.student_id
        AND s.guide_id = auth.uid()
    )
  );

-- Allow anon inserts (for intake form via RPC)
CREATE POLICY "Anon can insert student skills"
  ON student_skills FOR INSERT
  WITH CHECK (TRUE);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. AI RECOMMENDATIONS — stored AI recommendations per student
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ai_recommendations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('skills', 'quests', 'groups')),
  content     JSONB NOT NULL DEFAULT '{}',
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'accepted', 'dismissed')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guides manage recommendations for their students"
  ON ai_recommendations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = ai_recommendations.student_id
        AND s.guide_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = ai_recommendations.student_id
        AND s.guide_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. QUEST GROUPS — group/role assignments for group quests
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS quest_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id    UUID REFERENCES quests(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'Group',
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE quest_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guides manage their quest groups"
  ON quest_groups FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE TABLE IF NOT EXISTS quest_group_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES quest_groups(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  role        TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, student_id)
);

ALTER TABLE quest_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guides manage group members"
  ON quest_group_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM quest_groups qg
      WHERE qg.id = quest_group_members.group_id
        AND qg.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quest_groups qg
      WHERE qg.id = quest_group_members.group_id
        AND qg.created_by = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. SCAFFOLDING — parent access + skill snapshots (future)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS parent_access (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parent_email  TEXT NOT NULL,
  access_token  TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE parent_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guides manage parent access for their students"
  ON parent_access FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = parent_access.student_id
        AND s.guide_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = parent_access.student_id
        AND s.guide_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS skill_snapshots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  skill_id    UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  proficiency TEXT NOT NULL,
  snapshot_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE skill_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guides read snapshots for their students"
  ON skill_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = skill_snapshots.student_id
        AND s.guide_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. ALTER STUDENTS TABLE — add profile fields
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE students ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS passions TEXT[] DEFAULT '{}';
ALTER TABLE students ADD COLUMN IF NOT EXISTS about_me TEXT DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS self_assessment JSONB DEFAULT '{}';
ALTER TABLE students ADD COLUMN IF NOT EXISTS avatar_emoji TEXT DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;
ALTER TABLE students ADD COLUMN IF NOT EXISTS invite_code TEXT;

-- Expand grade_band constraint to include 9-12 (may already exist, so use safe approach)
DO $$
BEGIN
  -- Drop old constraint if it exists, then add new one
  ALTER TABLE students DROP CONSTRAINT IF EXISTS students_grade_band_check;
  ALTER TABLE students ADD CONSTRAINT students_grade_band_check
    CHECK (grade_band IS NULL OR grade_band IN ('K-2', '3-5', '6-8', '9-12'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not update grade_band constraint: %', SQLERRM;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. RPC FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Validate an invite code (anon callable)
CREATE OR REPLACE FUNCTION validate_invite(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_invite RECORD;
  v_guide  RECORD;
  v_school RECORD;
BEGIN
  SELECT * INTO v_invite
  FROM guide_invites
  WHERE code = p_code AND active = TRUE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', FALSE, 'error', 'Invalid or expired invite code');
  END IF;

  -- Check expiration
  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RETURN jsonb_build_object('valid', FALSE, 'error', 'This invite link has expired');
  END IF;

  -- Check max uses
  IF v_invite.max_uses IS NOT NULL AND v_invite.use_count >= v_invite.max_uses THEN
    RETURN jsonb_build_object('valid', FALSE, 'error', 'This invite link has reached its maximum uses');
  END IF;

  -- Get guide info
  SELECT full_name, school_id INTO v_guide FROM profiles WHERE id = v_invite.guide_id;
  IF v_guide.school_id IS NOT NULL THEN
    SELECT name INTO v_school FROM schools WHERE id = v_guide.school_id;
  END IF;

  RETURN jsonb_build_object(
    'valid', TRUE,
    'guide_name', COALESCE(v_guide.full_name, ''),
    'school_name', COALESCE(v_school.name, ''),
    'guide_id', v_invite.guide_id,
    'school_id', v_invite.school_id,
    'invite_id', v_invite.id
  );
END;
$$;

-- Student intake: create student from invite code (anon callable)
CREATE OR REPLACE FUNCTION student_intake(
  p_code       TEXT,
  p_name       TEXT,
  p_age        INT DEFAULT NULL,
  p_grade_band TEXT DEFAULT NULL,
  p_email      TEXT DEFAULT NULL,
  p_interests  TEXT[] DEFAULT '{}',
  p_passions   TEXT[] DEFAULT '{}',
  p_about_me   TEXT DEFAULT '',
  p_avatar_emoji TEXT DEFAULT '',
  p_self_assessment JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_invite  RECORD;
  v_pin     TEXT;
  v_student RECORD;
BEGIN
  -- Validate invite
  SELECT * INTO v_invite
  FROM guide_invites
  WHERE code = p_code AND active = TRUE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Invalid invite code');
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Invite expired');
  END IF;

  IF v_invite.max_uses IS NOT NULL AND v_invite.use_count >= v_invite.max_uses THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Invite at capacity');
  END IF;

  -- Generate 4-digit PIN
  v_pin := LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');

  -- Create student
  INSERT INTO students (
    name, age, grade_band, email, interests, passions, about_me,
    avatar_emoji, self_assessment, guide_id, pin, invite_code, onboarded_at
  ) VALUES (
    p_name, p_age, p_grade_band, p_email, p_interests, p_passions, p_about_me,
    p_avatar_emoji, p_self_assessment, v_invite.guide_id, v_pin, p_code, now()
  )
  RETURNING * INTO v_student;

  -- Increment invite use count
  UPDATE guide_invites SET use_count = use_count + 1 WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'student_id', v_student.id,
    'student_name', v_student.name,
    'pin', v_pin
  );
END;
$$;

-- Generate a unique invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 6-char alphanumeric code (uppercase)
    v_code := UPPER(SUBSTR(MD5(gen_random_uuid()::TEXT), 1, 6));
    SELECT EXISTS(SELECT 1 FROM guide_invites WHERE code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$;

-- Get student skills with skill details
CREATE OR REPLACE FUNCTION get_student_skills(p_student_id UUID)
RETURNS TABLE (
  skill_id UUID,
  skill_name TEXT,
  category TEXT,
  proficiency TEXT,
  source TEXT,
  description TEXT,
  icon TEXT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    s.id AS skill_id,
    s.name AS skill_name,
    s.category,
    COALESCE(ss.proficiency, 'none') AS proficiency,
    COALESCE(ss.source, '') AS source,
    s.description,
    s.icon
  FROM skills s
  LEFT JOIN student_skills ss ON ss.skill_id = s.id AND ss.student_id = p_student_id
  ORDER BY s.category, s.sort_order;
$$;

-- Grant anon access to RPC functions
GRANT EXECUTE ON FUNCTION validate_invite(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION student_intake(TEXT, TEXT, INT, TEXT, TEXT, TEXT[], TEXT[], TEXT, TEXT, JSONB) TO anon;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. SEED SKILLS CATALOG (25 skills)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO skills (name, category, description, icon, standards, grade_bands, sort_order) VALUES
  -- Core skills (7)
  ('Reading Comprehension', 'core', 'Understanding and analyzing written text', 'book-open', ARRAY['ELA.RI', 'ELA.RL'], ARRAY['K-2','3-5','6-8','9-12'], 1),
  ('Writing', 'core', 'Expressing ideas clearly through written communication', 'pencil', ARRAY['ELA.W'], ARRAY['K-2','3-5','6-8','9-12'], 2),
  ('Math Reasoning', 'core', 'Solving problems using mathematical thinking', 'calculator', ARRAY['MATH.OA', 'MATH.RP'], ARRAY['K-2','3-5','6-8','9-12'], 3),
  ('Fractions & Decimals', 'core', 'Working with parts, ratios, and proportional thinking', 'pie-chart', ARRAY['MATH.NF', 'MATH.NS'], ARRAY['3-5','6-8'], 4),
  ('Data Analysis', 'core', 'Collecting, organizing, and interpreting data', 'bar-chart-2', ARRAY['MATH.MD', 'MATH.SP'], ARRAY['3-5','6-8','9-12'], 5),
  ('Scientific Thinking', 'core', 'Observing, hypothesizing, and experimenting', 'flask-conical', ARRAY['NGSS.SEP'], ARRAY['K-2','3-5','6-8','9-12'], 6),
  ('Research', 'core', 'Finding, evaluating, and synthesizing information', 'search', ARRAY['ELA.W.7', 'ELA.W.8'], ARRAY['3-5','6-8','9-12'], 7),

  -- Soft skills (8)
  ('Teamwork', 'soft', 'Collaborating effectively with others', 'users', ARRAY[]::TEXT[], ARRAY['K-2','3-5','6-8','9-12'], 10),
  ('Communication', 'soft', 'Sharing ideas clearly and listening actively', 'message-circle', ARRAY['ELA.SL'], ARRAY['K-2','3-5','6-8','9-12'], 11),
  ('Critical Thinking', 'soft', 'Analyzing problems from multiple angles', 'brain', ARRAY[]::TEXT[], ARRAY['K-2','3-5','6-8','9-12'], 12),
  ('Perseverance', 'soft', 'Sticking with challenges and learning from setbacks', 'mountain', ARRAY[]::TEXT[], ARRAY['K-2','3-5','6-8','9-12'], 13),
  ('Creativity', 'soft', 'Generating original ideas and novel solutions', 'sparkles', ARRAY[]::TEXT[], ARRAY['K-2','3-5','6-8','9-12'], 14),
  ('Self-Management', 'soft', 'Planning time, setting goals, and staying organized', 'clock', ARRAY[]::TEXT[], ARRAY['3-5','6-8','9-12'], 15),
  ('Empathy', 'soft', 'Understanding and respecting different perspectives', 'heart', ARRAY[]::TEXT[], ARRAY['K-2','3-5','6-8','9-12'], 16),
  ('Leadership', 'soft', 'Guiding, motivating, and supporting others', 'flag', ARRAY[]::TEXT[], ARRAY['3-5','6-8','9-12'], 17),

  -- Interest-based skills (10)
  ('Coding', 'interest', 'Writing programs and building digital projects', 'code', ARRAY[]::TEXT[], ARRAY['3-5','6-8','9-12'], 20),
  ('Digital Design', 'interest', 'Creating visual content with digital tools', 'palette', ARRAY[]::TEXT[], ARRAY['3-5','6-8','9-12'], 21),
  ('Engineering', 'interest', 'Designing and building physical structures or systems', 'wrench', ARRAY['NGSS.ETS'], ARRAY['K-2','3-5','6-8','9-12'], 22),
  ('Environmental Science', 'interest', 'Exploring ecosystems and sustainability', 'leaf', ARRAY['NGSS.ESS'], ARRAY['K-2','3-5','6-8','9-12'], 23),
  ('Storytelling', 'interest', 'Crafting narratives across mediums', 'book', ARRAY['ELA.W.3'], ARRAY['K-2','3-5','6-8','9-12'], 24),
  ('Music', 'interest', 'Creating, performing, and analyzing music', 'music', ARRAY[]::TEXT[], ARRAY['K-2','3-5','6-8','9-12'], 25),
  ('Culinary Science', 'interest', 'Exploring food science and cooking techniques', 'chef-hat', ARRAY[]::TEXT[], ARRAY['3-5','6-8','9-12'], 26),
  ('Animal Science', 'interest', 'Studying animal behavior, biology, and care', 'paw-print', ARRAY['NGSS.LS'], ARRAY['K-2','3-5','6-8','9-12'], 27),
  ('Game Design', 'interest', 'Designing and building games (digital or physical)', 'gamepad-2', ARRAY[]::TEXT[], ARRAY['3-5','6-8','9-12'], 28),
  ('Public Speaking', 'interest', 'Presenting ideas confidently to an audience', 'mic', ARRAY['ELA.SL'], ARRAY['3-5','6-8','9-12'], 29)
ON CONFLICT (name) DO NOTHING;
