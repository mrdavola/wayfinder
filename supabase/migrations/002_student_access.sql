-- ===================== PUBLIC (STUDENT) ACCESS POLICIES =====================
-- Allows unauthenticated students to view and interact with active quests
-- via shareable links. No student account required.

-- Active quests: public read
create policy "Public can read active quests" on public.quests
  for select using (status = 'active');

-- Quest stages: public read for active quests
create policy "Public can read stages of active quests" on public.quest_stages
  for select using (
    exists (select 1 from public.quests q where q.id = quest_id and q.status = 'active')
  );

-- Quest stages: students can mark stages complete
create policy "Public can complete stages of active quests" on public.quest_stages
  for update using (
    exists (select 1 from public.quests q where q.id = quest_id and q.status = 'active')
  );

-- Career simulations: public read for active quests
create policy "Public can read simulations of active quests" on public.career_simulations
  for select using (
    exists (select 1 from public.quests q where q.id = quest_id and q.status = 'active')
  );

-- Quest student assignments: public read (for student name picker)
create policy "Public can read quest student assignments" on public.quest_students
  for select using (
    exists (select 1 from public.quests q where q.id = quest_id and q.status = 'active')
  );

-- Students table: public read for students assigned to active quests
create policy "Public can read students in active quests" on public.students
  for select using (
    exists (
      select 1 from public.quest_students qs
      join public.quests q on q.id = qs.quest_id
      where qs.student_id = students.id and q.status = 'active'
    )
  );

-- Reflection entries: public read for active quests
create policy "Public can read reflections of active quests" on public.reflection_entries
  for select using (
    exists (select 1 from public.quests q where q.id = quest_id and q.status = 'active')
  );

-- Reflection entries: students can add their own notes
create policy "Public can add reflections to active quests" on public.reflection_entries
  for insert with check (
    exists (select 1 from public.quests q where q.id = quest_id and q.status = 'active')
  );

-- ===================== EXPANDED ROLE SYSTEM =====================
-- Update profiles role constraint to support full hierarchy

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student', 'guide', 'school_admin', 'district_admin', 'superadmin'));

-- Add school and district context to profiles
alter table public.profiles
  add column if not exists title text,
  add column if not exists district_id uuid,
  add column if not exists avatar_url text;

-- ===================== DEMO ROLE NOTES =====================
-- To create demo accounts, sign up via the app and then run:
--
-- UPDATE public.profiles SET role = 'school_admin'
--   WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@demo.wayfinder.app');
--
-- UPDATE public.profiles SET role = 'district_admin'
--   WHERE id = (SELECT id FROM auth.users WHERE email = 'district@demo.wayfinder.app');
--
-- UPDATE public.profiles SET role = 'superadmin'
--   WHERE id = (SELECT id FROM auth.users WHERE email = 'super@demo.wayfinder.app');
