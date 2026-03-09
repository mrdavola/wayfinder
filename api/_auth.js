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
