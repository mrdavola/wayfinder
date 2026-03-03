-- Fix profiles role check constraint to include 'school_leader'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('guide', 'admin', 'school_leader'));
