// api/submission-upload-url.js — Issue a signed upload URL for student-submissions
//
// The student-submissions bucket is locked down to service-role writes only
// (see migrations/051_storage_lockdown.sql). Frontend uploads now go through
// this endpoint so that we can verify the caller (guide JWT or PIN-verified
// student) before issuing a short-lived signed upload URL.

import { createClient } from '@supabase/supabase-js';
import { requireAnyCaller } from './_auth.js';

export const config = { maxDuration: 30 };

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BUCKET = 'student-submissions';
const MAX_PATH_LENGTH = 256;
// Path shape we generate on the client: <questId>/<stageId>/<safeName>/<ts>.<ext>
// Reject anything that doesn't look like four slash-separated segments and
// only contains safe characters.
const SAFE_PATH = /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (await requireAnyCaller(req, res)) return;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Storage not configured (missing service role key)' });
  }

  const { path } = req.body || {};
  if (typeof path !== 'string' || path.length === 0 || path.length > MAX_PATH_LENGTH) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  if (!SAFE_PATH.test(path)) {
    return res.status(400).json({ error: 'Path format not allowed' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);

    if (error || !data) {
      console.error('Signed upload URL error:', error);
      return res.status(500).json({ error: 'Could not create upload URL' });
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

    return res.status(200).json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      publicUrl: pub.publicUrl,
    });
  } catch (err) {
    console.error('submission-upload-url error:', err?.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
