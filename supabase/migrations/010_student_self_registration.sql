-- Migration 010: Student self-registration via classroom code
-- Run in Supabase SQL Editor

-- ── 1. Add classroom_code to profiles (guides get a shareable join code) ─────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS classroom_code text UNIQUE;

-- Generate codes for existing guide/school_admin profiles
UPDATE public.profiles
SET classroom_code = UPPER(
  SUBSTRING(MD5(id::text || 'code'), 1, 3) ||
  '-' ||
  SUBSTRING(MD5(id::text || 'salt'), 1, 3)
)
WHERE classroom_code IS NULL
  AND role IN ('guide', 'school_admin', 'superadmin');

-- ── 2. Add student_id link to profiles (for self-registered students) ─────────
-- Links a Supabase auth user to their students table record
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linked_student_id uuid REFERENCES public.students(id) ON DELETE SET NULL;

-- ── 3. Update profiles role constraint to include 'student' ──────────────────
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
UPDATE public.profiles SET role = 'guide'
  WHERE role NOT IN ('guide', 'school_admin', 'superadmin', 'student');
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('guide', 'school_admin', 'superadmin', 'student'));

-- ── 4. join_classroom() — student calls this after signup to link to a guide ──
CREATE OR REPLACE FUNCTION public.join_classroom(p_classroom_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guide_id   uuid;
  v_student    public.students%ROWTYPE;
  v_profile    public.profiles%ROWTYPE;
BEGIN
  -- Find the guide with this code
  SELECT id INTO v_guide_id
  FROM public.profiles
  WHERE UPPER(TRIM(classroom_code)) = UPPER(TRIM(p_classroom_code))
    AND role IN ('guide', 'school_admin', 'superadmin')
  LIMIT 1;

  IF v_guide_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Classroom code not found. Check with your guide.');
  END IF;

  -- Get calling user's profile
  SELECT * INTO v_profile FROM public.profiles WHERE id = auth.uid();

  IF v_profile.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not signed in.');
  END IF;

  -- If student already has a linked_student_id, they already joined
  IF v_profile.linked_student_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'You have already joined a classroom.');
  END IF;

  -- Check if a pre-created student record matches by name
  SELECT * INTO v_student
  FROM public.students
  WHERE guide_id = v_guide_id
    AND LOWER(TRIM(name)) = LOWER(TRIM(v_profile.full_name))
  LIMIT 1;

  -- If no matching pre-created student, create one
  IF v_student.id IS NULL THEN
    INSERT INTO public.students (name, guide_id, pin)
    VALUES (
      v_profile.full_name,
      v_guide_id,
      LPAD(FLOOR(RANDOM() * 9000 + 1000)::text, 4, '0')
    )
    RETURNING * INTO v_student;
  END IF;

  -- Link the profile to the student record
  UPDATE public.profiles
  SET linked_student_id = v_student.id, role = 'student'
  WHERE id = auth.uid();

  RETURN json_build_object(
    'success', true,
    'student_id', v_student.id,
    'student_name', v_student.name,
    'guide_id', v_guide_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_classroom(text) TO authenticated;

-- ── 5. get_my_student_quests() — for self-registered students ─────────────────
-- Uses auth.uid() to find linked_student_id, then returns quests
CREATE OR REPLACE FUNCTION public.get_my_student_quests()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_result json;
BEGIN
  SELECT linked_student_id INTO v_student_id
  FROM public.profiles WHERE id = auth.uid();

  IF v_student_id IS NULL THEN
    RETURN '[]'::json;
  END IF;

  RETURN public.get_student_quests(v_student_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_student_quests() TO authenticated;

-- ── 6. RLS: students can read their own profile ────────────────────────────────
-- (profiles table already has "Users can view own profile" policy)
-- No additional policies needed — students use SECURITY DEFINER functions.

-- ── 7. get_classroom_code() — guide fetches their own code ───────────────────
CREATE OR REPLACE FUNCTION public.get_classroom_code()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT classroom_code FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_classroom_code() TO authenticated;
