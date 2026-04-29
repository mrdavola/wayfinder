-- ═══════════════════════════════════════════════════════════════════════════════
-- 049: Grants & policy fixes
--
-- 1) Add missing GRANT EXECUTE TO anon for SECURITY DEFINER functions that are
--    called from public/anonymous pages (parent dashboard, student quest page).
--    These were missing in 014, 015, 016, and 022 — calls were silently failing
--    on environments where the default permissive grant didn't apply.
--
-- 2) Replace the wide-open "Anon can read profiles" policy from 021 with a
--    targeted RPC that returns only the buddy_pairing_enabled flag.
--
-- 3) Drop the misnamed-typo "Anon can insert student skills" policy that
--    migration 040 attempted (and failed) to remove. The DROP in 040 used
--    "student_skills" with an underscore, but the original policy name
--    contained a space ("student skills"), so the policy is still active.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Missing GRANTs ─────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION public.get_guide_messages(uuid, uuid, text)        TO anon;
GRANT EXECUTE ON FUNCTION public.get_guide_messages(uuid, uuid, text)        TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_submission_feedback(uuid, text)         TO anon;
GRANT EXECUTE ON FUNCTION public.get_submission_feedback(uuid, text)         TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_parent_dashboard(text)                  TO anon;
GRANT EXECUTE ON FUNCTION public.get_parent_dashboard(text)                  TO authenticated;

GRANT EXECUTE ON FUNCTION public.parent_onboard(text, text, text, text, text, text[], jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.parent_onboard(text, text, text, text, text, text[], jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION public.update_learning_outcomes(text, jsonb)       TO anon;
GRANT EXECUTE ON FUNCTION public.update_learning_outcomes(text, jsonb)       TO authenticated;

-- ── 2. Replace "Anon can read profiles" with a scoped RPC ────────────────────

DROP POLICY IF EXISTS "Anon can read profiles" ON public.profiles;

CREATE OR REPLACE FUNCTION public.get_buddy_pairing_enabled(p_guide_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT buddy_pairing_enabled FROM public.profiles WHERE id = p_guide_id),
    FALSE
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_buddy_pairing_enabled(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_buddy_pairing_enabled(uuid) TO authenticated;

-- ── 3. Drop the typo'd policy that 040 missed ────────────────────────────────
-- Original name (from 012) had a SPACE: "Anon can insert student skills"
-- 040 tried to drop "Anon can insert student_skills" (underscore) → no-op.

DROP POLICY IF EXISTS "Anon can insert student skills" ON public.student_skills;
