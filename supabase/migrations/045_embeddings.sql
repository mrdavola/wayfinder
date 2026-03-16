-- 045_embeddings.sql
-- Embedding infrastructure for semantic similarity across student submissions

-- Embeddings table for storing vector representations of student creations
CREATE TABLE IF NOT EXISTS submission_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES stage_submissions(id) ON DELETE CASCADE,
  quest_id UUID REFERENCES quests(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES quest_stages(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,

  -- The embedding vector stored as a JSON array of floats
  -- Using JSONB because pgvector may not be enabled yet
  -- Can be migrated to vector(768) type later if pgvector is available
  embedding JSONB NOT NULL,

  -- Metadata about what was embedded
  content_type TEXT NOT NULL, -- 'text', 'canvas', 'sketch', 'slides', 'image', 'audio_transcript'
  content_summary TEXT,       -- human-readable summary of what was embedded
  dimensions INTEGER NOT NULL DEFAULT 768,
  model_id TEXT NOT NULL DEFAULT 'gemini-embedding-exp-03-07',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(submission_id)
);

-- Index for looking up embeddings by quest
CREATE INDEX IF NOT EXISTS idx_embeddings_quest ON submission_embeddings(quest_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_student ON submission_embeddings(student_name);

-- Skill embeddings for standards alignment
CREATE TABLE IF NOT EXISTS skill_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  description TEXT,
  embedding JSONB NOT NULL,
  dimensions INTEGER NOT NULL DEFAULT 768,
  model_id TEXT NOT NULL DEFAULT 'gemini-embedding-exp-03-07',
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(skill_id)
);

-- Helper function for cosine similarity between two float arrays
CREATE OR REPLACE FUNCTION cosine_sim(a FLOAT[], b FLOAT[]) RETURNS FLOAT
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  dot_product FLOAT := 0;
  mag_a FLOAT := 0;
  mag_b FLOAT := 0;
  i INTEGER;
BEGIN
  IF array_length(a, 1) IS NULL OR array_length(b, 1) IS NULL
     OR array_length(a, 1) != array_length(b, 1) THEN
    RETURN 0;
  END IF;

  FOR i IN 1..array_length(a, 1) LOOP
    dot_product := dot_product + (a[i] * b[i]);
    mag_a := mag_a + (a[i] * a[i]);
    mag_b := mag_b + (b[i] * b[i]);
  END LOOP;

  IF mag_a = 0 OR mag_b = 0 THEN
    RETURN 0;
  END IF;

  RETURN dot_product / (sqrt(mag_a) * sqrt(mag_b));
END;
$$;

-- RPC for finding similar submissions (cosine similarity in SQL)
-- Brute-force approach; works fine for <10k vectors
CREATE OR REPLACE FUNCTION find_similar_submissions(
  p_embedding JSONB,
  p_limit INTEGER DEFAULT 5,
  p_exclude_submission_id UUID DEFAULT NULL,
  p_quest_id UUID DEFAULT NULL
) RETURNS TABLE (
  submission_id UUID,
  quest_id UUID,
  stage_id UUID,
  student_name TEXT,
  content_type TEXT,
  content_summary TEXT,
  similarity FLOAT
) LANGUAGE plpgsql AS $$
DECLARE
  query_vec FLOAT[];
BEGIN
  -- Convert JSONB array to float array
  SELECT array_agg(val::FLOAT)
  INTO query_vec
  FROM jsonb_array_elements_text(p_embedding) AS val;

  RETURN QUERY
  SELECT
    se.submission_id,
    se.quest_id,
    se.stage_id,
    se.student_name,
    se.content_type,
    se.content_summary,
    cosine_sim(query_vec, (
      SELECT array_agg(v::FLOAT) FROM jsonb_array_elements_text(se.embedding) AS v
    )) AS similarity
  FROM submission_embeddings se
  WHERE (p_exclude_submission_id IS NULL OR se.submission_id != p_exclude_submission_id)
    AND (p_quest_id IS NULL OR se.quest_id = p_quest_id)
  ORDER BY similarity DESC
  LIMIT p_limit;
END;
$$;
