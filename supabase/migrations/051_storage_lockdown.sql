-- ═══════════════════════════════════════════════════════════════════════════════
-- 051: Storage lockdown for student-submissions bucket
--
-- Background: migration 011 created the bucket as public with wide-open RLS
-- policies on storage.objects:
--   public_upload_submissions: anyone can INSERT
--   public_read_submissions:   anyone can SELECT
--
-- This means any anon caller could upload arbitrary files (vandalism / cost
-- amplification) or enumerate everyone's submitted work. Migration 040 noted
-- this and explicitly deferred the fix to a manual Dashboard step that was
-- never executed.
--
-- This migration:
--   1. Drops the open INSERT/SELECT policies.
--   2. Replaces them with service_role-only writes. Reads stay public (URLs
--      include a timestamp + sanitized name so they're unguessable, and
--      guides need to view submitted work without juggling signed URLs).
--   3. Frontend uploads now go through /api/submission-upload-url, which
--      verifies the caller (guide JWT or PIN-verified student) and returns
--      a short-lived signed upload URL. See api/submission-upload-url.js.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop the open policies. IF EXISTS so this migration is rerunnable.
DROP POLICY IF EXISTS "public_upload_submissions" ON storage.objects;
DROP POLICY IF EXISTS "public_read_submissions"   ON storage.objects;

-- Reads remain open for the bucket — submission URLs are shared with guides
-- (and parents in the future) without auth, and the bucket is marked public
-- so getPublicUrl() resolves. URLs include a timestamp; they're not listable.
CREATE POLICY "submissions_read_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'student-submissions');

-- Writes are restricted to the service role. The serverless endpoint
-- /api/submission-upload-url verifies the caller, then issues a signed upload
-- URL using the service role key.
CREATE POLICY "submissions_write_service_only"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'student-submissions'
    AND auth.role() = 'service_role'
  );

CREATE POLICY "submissions_update_service_only"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'student-submissions'
    AND auth.role() = 'service_role'
  );

CREATE POLICY "submissions_delete_service_only"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'student-submissions'
    AND auth.role() = 'service_role'
  );
