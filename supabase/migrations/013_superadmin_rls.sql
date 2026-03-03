-- 013: Superadmin RLS bypass policies
-- Run this in Supabase SQL Editor, then: NOTIFY pgrst, 'reload schema';

-- Step 0: Drop the broken policies from the first attempt
DROP POLICY IF EXISTS "Superadmins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Superadmins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Superadmins can read all schools" ON public.schools;
DROP POLICY IF EXISTS "Superadmins can read all quests" ON public.quests;
DROP POLICY IF EXISTS "Superadmins can read all students" ON public.students;
DROP POLICY IF EXISTS "Superadmins can read all guide_invites" ON public.guide_invites;
DROP POLICY IF EXISTS "Superadmins can read all quest_students" ON public.quest_students;

-- Step 1: Helper function (SECURITY DEFINER bypasses RLS, avoiding recursion)
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'superadmin'
  );
$$;

-- Step 2: Policies using the helper function

-- Superadmin can read all profiles
CREATE POLICY "Superadmins can read all profiles" ON public.profiles
  FOR SELECT USING (public.is_superadmin());

-- Superadmin can read all schools
CREATE POLICY "Superadmins can read all schools" ON public.schools
  FOR SELECT USING (public.is_superadmin());

-- Superadmin can read all quests
CREATE POLICY "Superadmins can read all quests" ON public.quests
  FOR SELECT USING (public.is_superadmin());

-- Superadmin can update any profile's role
CREATE POLICY "Superadmins can update profiles" ON public.profiles
  FOR UPDATE USING (public.is_superadmin());

-- Superadmin can read all students
CREATE POLICY "Superadmins can read all students" ON public.students
  FOR SELECT USING (public.is_superadmin());

-- Superadmin can read all guide_invites
CREATE POLICY "Superadmins can read all guide_invites" ON public.guide_invites
  FOR SELECT USING (public.is_superadmin());

-- Superadmin can read all quest_students
CREATE POLICY "Superadmins can read all quest_students" ON public.quest_students
  FOR SELECT USING (public.is_superadmin());
