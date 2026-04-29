// api/_auth.js — Shared auth helper for serverless functions
// Verifies Supabase JWT from Authorization header to protect paid API endpoints

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

/**
 * Verify the caller has a valid Supabase session.
 * Returns { user, error }. If error is set, the request should be rejected.
 */
export async function verifyAuth(req) {
  const authHeader = req.headers?.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return { user: null, error: 'Missing authorization header' };
  }

  const token = authHeader.slice(7);

  // Use service role key if available (can verify any JWT), else use anon key
  const key = supabaseServiceKey || supabaseAnonKey;
  if (!supabaseUrl || !key) {
    return { user: null, error: 'Supabase not configured' };
  }

  try {
    const supabase = createClient(supabaseUrl, key);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return { user: null, error: 'Invalid or expired token' };
    }
    return { user, error: null };
  } catch {
    return { user: null, error: 'Auth verification failed' };
  }
}

/**
 * Helper to reject unauthenticated requests. Returns true if rejected.
 */
export async function requireAuth(req, res) {
  const { user, error } = await verifyAuth(req);
  if (error) {
    res.status(401).json({ error });
    return true;
  }
  req.user = user;
  return false;
}

/**
 * Verify a student session via PIN. Reads the X-Student-Auth header
 * (format: "<student_id>:<pin>") and confirms against the students table.
 * Requires SUPABASE_SERVICE_ROLE_KEY to be configured.
 */
export async function verifyStudentSession(req) {
  const header = req.headers?.['x-student-auth'];
  if (!header) return { studentId: null, error: 'No student auth header' };

  const raw = String(header);
  const sep = raw.indexOf(':');
  if (sep <= 0) return { studentId: null, error: 'Invalid student auth format' };

  const studentId = raw.slice(0, sep);
  const pin = raw.slice(sep + 1).trim();
  if (!studentId || !pin) return { studentId: null, error: 'Invalid student auth format' };

  if (!supabaseUrl || !supabaseServiceKey) {
    return { studentId: null, error: 'Service role not configured' };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase
      .from('students')
      .select('id, pin')
      .eq('id', studentId)
      .single();
    if (error || !data) return { studentId: null, error: 'Student not found' };
    if (!data.pin || data.pin !== pin) return { studentId: null, error: 'Invalid student PIN' };
    return { studentId: data.id, error: null };
  } catch {
    return { studentId: null, error: 'Student auth verification failed' };
  }
}

/**
 * Accept either a Supabase JWT (guides) or an X-Student-Auth header
 * (PIN-verified students). Returns true if rejected.
 */
export async function requireAnyCaller(req, res) {
  const { user } = await verifyAuth(req);
  if (user) {
    req.user = user;
    return false;
  }
  const { studentId } = await verifyStudentSession(req);
  if (studentId) {
    req.studentId = studentId;
    return false;
  }
  res.status(401).json({ error: 'Authentication required' });
  return true;
}

/**
 * Server-enforced safety preamble. Prepended to every system prompt by the
 * AI proxy so a malicious caller cannot bypass it by sending their own.
 */
export const SAFETY_PREAMBLE = `SAFETY RULES (non-negotiable):
- All content MUST be appropriate for school-age children (ages 5-18).
- NEVER generate, discuss, or reference: violence/weapons, sexual content, drugs/alcohol, self-harm, hate speech, profanity, or any content unsuitable for a K-12 classroom.
- If a student's input references inappropriate topics, gently redirect to the learning task without engaging with the inappropriate content.
- Keep all scenarios, examples, and language educational and age-appropriate.
`;
