-- ===================== SUBMISSION FEEDBACK =====================
-- AI-generated feedback on student work submissions

create table public.submission_feedback (
  id uuid default gen_random_uuid() primary key,
  submission_id uuid,
  quest_id uuid references public.quests(id) on delete cascade not null,
  stage_id uuid references public.quest_stages(id) on delete cascade,
  student_name text not null,
  feedback_text text not null,
  skills_demonstrated text[] default '{}',
  encouragement text,
  next_steps text,
  created_at timestamptz default now()
);

alter table public.submission_feedback enable row level security;

-- Guides can read feedback for their quests
create policy "Guides can read submission feedback" on public.submission_feedback
  for select using (
    exists (
      select 1 from public.quests q where q.id = quest_id and q.guide_id = auth.uid()
    )
  );

-- Anon can insert (students are unauthenticated)
create policy "Anon can insert submission feedback" on public.submission_feedback
  for insert with check (true);

-- Index
create index submission_feedback_quest_idx on public.submission_feedback(quest_id, student_name);

-- RPC for anon student reads
create or replace function public.get_submission_feedback(p_quest_id uuid, p_student_name text)
returns setof public.submission_feedback
language sql security definer
as $$
  select * from public.submission_feedback
  where quest_id = p_quest_id
    and student_name = p_student_name
  order by created_at asc;
$$;
