-- Migration 008: Fix overly restrictive constraints + role system
-- Run in Supabase SQL Editor

-- ── 1. Drop career_pathway constraint on quests ──────────────────────────────
-- The original schema only allowed 3 pathways, but the app generates many more.
ALTER TABLE public.quests DROP CONSTRAINT IF EXISTS quests_career_pathway_check;

-- ── 2. Fix role constraint to match what the app actually uses ───────────────
-- Settings sends 'guide', 'school_admin', 'superadmin'
-- Drop old constraint first, fix data, then re-add
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Migrate any profiles with old/invalid role values BEFORE adding the constraint
UPDATE public.profiles SET role = 'guide'
  WHERE role NOT IN ('guide', 'school_admin', 'superadmin');

-- Now safe to add the constraint
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('guide', 'school_admin', 'superadmin'));

-- ── 3. Add superadmin helper function ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin'
  );
$$;

-- ── 4. Add avatar_url column to profiles (if missing) ────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- ── 5. Add school_name to profiles for display convenience ───────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_name text;
