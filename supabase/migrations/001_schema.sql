-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ===================== SCHOOLS =====================
create table public.schools (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  location text,
  standards_framework text default 'common_core',
  created_at timestamptz default now()
);
alter table public.schools enable row level security;
-- Anyone authenticated can read schools
create policy "Authenticated users can read schools" on public.schools
  for select using (auth.role() = 'authenticated');
-- Anyone authenticated can create schools (during onboarding)
create policy "Authenticated users can create schools" on public.schools
  for insert with check (auth.role() = 'authenticated');

-- ===================== PROFILES =====================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  role text not null default 'guide',
  school_id uuid references public.schools(id),
  onboarding_complete boolean default false,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ===================== STUDENTS =====================
create table public.students (
  id uuid default gen_random_uuid() primary key,
  guide_id uuid references public.profiles(id) on delete cascade not null,
  school_id uuid references public.schools(id),
  name text not null,
  age integer,
  grade_band text check (grade_band in ('K-2', '3-5', '6-8')),
  interests text[] default '{}',
  created_at timestamptz default now()
);
alter table public.students enable row level security;
create policy "Guides can manage their students" on public.students
  for all using (auth.uid() = guide_id);

-- ===================== QUESTS =====================
create table public.quests (
  id uuid default gen_random_uuid() primary key,
  guide_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  subtitle text,
  narrative_hook text,
  career_pathway text,
  quest_type text default 'individual' check (quest_type in ('individual', 'group')),
  status text default 'draft' check (status in ('draft', 'active', 'completed', 'archived')),
  total_duration_days integer default 10,
  academic_standards text[] default '{}',
  reflection_prompts text[] default '{}',
  parent_summary text,
  created_at timestamptz default now(),
  completed_at timestamptz
);
alter table public.quests enable row level security;
create policy "Guides can manage their quests" on public.quests
  for all using (auth.uid() = guide_id);
create index quests_guide_id_idx on public.quests(guide_id);
create index quests_status_idx on public.quests(status);

-- ===================== QUEST_STUDENTS =====================
create table public.quest_students (
  quest_id uuid references public.quests(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  primary key (quest_id, student_id)
);
alter table public.quest_students enable row level security;
create policy "Guides can manage quest student assignments" on public.quest_students
  for all using (
    exists (
      select 1 from public.quests q where q.id = quest_id and q.guide_id = auth.uid()
    )
  );

-- ===================== QUEST_STAGES =====================
create table public.quest_stages (
  id uuid default gen_random_uuid() primary key,
  quest_id uuid references public.quests(id) on delete cascade not null,
  stage_number integer not null,
  title text not null,
  stage_type text check (stage_type in ('research', 'build', 'experiment', 'simulate', 'reflect', 'present')),
  duration_days integer default 1,
  description text,
  academic_skills text[] default '{}',
  skill_note text,
  deliverable text,
  guiding_questions text[] default '{}',
  resources text[] default '{}',
  group_adaptation text,
  status text default 'locked' check (status in ('locked', 'active', 'completed')),
  branch_options jsonb,
  completed_at timestamptz,
  created_at timestamptz default now()
);
alter table public.quest_stages enable row level security;
create policy "Guides can manage stages of their quests" on public.quest_stages
  for all using (
    exists (
      select 1 from public.quests q where q.id = quest_id and q.guide_id = auth.uid()
    )
  );
create index quest_stages_quest_id_idx on public.quest_stages(quest_id);

-- ===================== CAREER_SIMULATIONS =====================
create table public.career_simulations (
  id uuid default gen_random_uuid() primary key,
  quest_id uuid references public.quests(id) on delete cascade not null,
  scenario_title text,
  role text,
  context text,
  key_decisions text[] default '{}',
  skills_assessed text[] default '{}',
  voice_agent_personality text,
  duration_minutes integer default 30,
  status text default 'locked' check (status in ('locked', 'available', 'in_progress', 'completed')),
  debrief_summary text,
  created_at timestamptz default now()
);
alter table public.career_simulations enable row level security;
create policy "Guides can manage simulations of their quests" on public.career_simulations
  for all using (
    exists (
      select 1 from public.quests q where q.id = quest_id and q.guide_id = auth.uid()
    )
  );

-- ===================== SIMULATION_MESSAGES =====================
create table public.simulation_messages (
  id uuid default gen_random_uuid() primary key,
  simulation_id uuid references public.career_simulations(id) on delete cascade not null,
  student_id uuid references public.students(id),
  role text not null check (role in ('agent', 'student')),
  content text not null,
  is_decision_point boolean default false,
  created_at timestamptz default now()
);
alter table public.simulation_messages enable row level security;
create policy "Guides can manage simulation messages" on public.simulation_messages
  for all using (
    exists (
      select 1 from public.career_simulations cs
      join public.quests q on q.id = cs.quest_id
      where cs.id = simulation_id and q.guide_id = auth.uid()
    )
  );

-- ===================== REFLECTION_ENTRIES =====================
create table public.reflection_entries (
  id uuid default gen_random_uuid() primary key,
  quest_id uuid references public.quests(id) on delete cascade not null,
  student_id uuid references public.students(id),
  entry_type text default 'student' check (entry_type in ('auto', 'student')),
  content text not null,
  stage_id uuid references public.quest_stages(id),
  created_at timestamptz default now()
);
alter table public.reflection_entries enable row level security;
create policy "Guides can manage reflection entries" on public.reflection_entries
  for all using (
    exists (
      select 1 from public.quests q where q.id = quest_id and q.guide_id = auth.uid()
    )
  );

-- ===================== QUEST_TEMPLATES =====================
create table public.quest_templates (
  id uuid default gen_random_uuid() primary key,
  guide_id uuid references public.profiles(id),
  title text not null,
  subtitle text,
  narrative_hook text,
  career_pathway text,
  quest_type text default 'individual',
  total_duration_days integer default 10,
  academic_standards text[] default '{}',
  interest_tags text[] default '{}',
  grade_band text,
  usage_count integer default 0,
  rating decimal(3,1) default 0,
  is_public boolean default false,
  stages_data jsonb,
  simulation_data jsonb,
  created_at timestamptz default now()
);
alter table public.quest_templates enable row level security;
create policy "Anyone can read public templates" on public.quest_templates
  for select using (is_public = true or auth.uid() = guide_id);
create policy "Guides can manage their templates" on public.quest_templates
  for all using (auth.uid() = guide_id);
