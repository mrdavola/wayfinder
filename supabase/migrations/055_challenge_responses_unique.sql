-- ============================================================
-- 055: ensure UNIQUE(challenge_id, student_id) on challenge_responses
-- ============================================================
-- Migration 027 declared the unique constraint inside CREATE TABLE
-- IF NOT EXISTS, so on environments where the table existed earlier
-- (e.g. via an older backfill bundle) the constraint was silently
-- skipped. challengeResponses.submit() upserts with
-- onConflict: 'challenge_id,student_id', which then fails with
-- "there is no unique or exclusion constraint matching the
-- ON CONFLICT specification".
--
-- This migration:
--   1. removes any duplicate (challenge_id, student_id) rows,
--      keeping the most recently assessed response;
--   2. adds the unique constraint if it does not already exist.

BEGIN;

-- 1. de-duplicate: keep the row with the latest assessed_at per
--    (challenge_id, student_id). Ties broken by id (deterministic).
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY challenge_id, student_id
      ORDER BY assessed_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM challenge_responses
)
DELETE FROM challenge_responses
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2. add the unique constraint if it isn't already present.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.challenge_responses'::regclass
      AND contype = 'u'
      AND conkey = ARRAY[
        (SELECT attnum FROM pg_attribute
          WHERE attrelid = 'public.challenge_responses'::regclass
            AND attname = 'challenge_id'),
        (SELECT attnum FROM pg_attribute
          WHERE attrelid = 'public.challenge_responses'::regclass
            AND attname = 'student_id')
      ]::int2[]
  ) THEN
    ALTER TABLE challenge_responses
      ADD CONSTRAINT challenge_responses_challenge_student_unique
      UNIQUE (challenge_id, student_id);
  END IF;
END $$;

COMMIT;
