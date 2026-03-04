-- ===================== GUIDE MESSAGES =====================
-- Persists Field Guide chat, Devil's Advocate, and AI feedback messages

create table public.guide_messages (
  id uuid default gen_random_uuid() primary key,
  quest_id uuid references public.quests(id) on delete cascade not null,
  stage_id uuid references public.quest_stages(id) on delete cascade,
  student_id uuid references public.students(id) on delete set null,
  student_name text not null,
  role text not null check (role in ('user', 'assistant', 'challenger')),
  content text not null,
  message_type text default 'field_guide' check (message_type in ('field_guide', 'devil_advocate', 'ai_feedback')),
  created_at timestamptz default now()
);

alter table public.guide_messages enable row level security;

-- Guides can read messages for their quests
create policy "Guides can read guide messages" on public.guide_messages
  for select using (
    exists (
      select 1 from public.quests q where q.id = quest_id and q.guide_id = auth.uid()
    )
  );

-- Anon can insert (students are unauthenticated)
create policy "Anon can insert guide messages" on public.guide_messages
  for insert with check (true);

-- Index for fast lookups
create index guide_messages_quest_stage_idx on public.guide_messages(quest_id, stage_id, student_name);

-- RPC for anon student reads
create or replace function public.get_guide_messages(p_quest_id uuid, p_stage_id uuid, p_student_name text)
returns setof public.guide_messages
language sql security definer
as $$
  select * from public.guide_messages
  where quest_id = p_quest_id
    and stage_id = p_stage_id
    and student_name = p_student_name
  order by created_at asc;
$$;
