create table if not exists public.creator_author_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active_pen_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.creator_work_meta (
  user_id uuid not null references auth.users(id) on delete cascade,
  work_id text not null,
  genre text not null default '',
  keywords text[] not null default '{}'::text[],
  age_rating text not null default 'all' check (age_rating in ('all', '15', '18')),
  update_day text not null default '',
  hiatus boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, work_id)
);

create table if not exists public.creator_episode_drafts (
  user_id uuid not null references auth.users(id) on delete cascade,
  work_id text not null,
  episode_id text,
  slot_key text not null,
  title text not null default '',
  access_type public.episode_access_type not null default 'free',
  price numeric(10,2) not null default 0,
  body text not null default '',
  workflow_step text not null default 'draft' check (workflow_step in ('draft', 'review', 'scheduled', 'published')),
  episode_type text not null default 'episode' check (episode_type in ('episode', 'afterword', 'notice', 'private')),
  age_rating text check (age_rating is null or age_rating in ('all', '15', '18')),
  scheduled_at timestamptz,
  publication_state text not null default 'draft' check (publication_state in ('draft', 'scheduled', 'published', 'updated')),
  published_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, work_id, slot_key)
);

create table if not exists public.creator_episode_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  work_id text not null,
  episode_id text,
  label text not null,
  state text not null check (state in ('draft', 'scheduled', 'published', 'updated')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists creator_work_meta_user_idx on public.creator_work_meta(user_id);
create index if not exists creator_episode_drafts_user_updated_idx on public.creator_episode_drafts(user_id, updated_at desc);
create index if not exists creator_episode_history_user_work_idx on public.creator_episode_history(user_id, work_id, created_at desc);

drop trigger if exists set_creator_author_preferences_updated_at on public.creator_author_preferences;
create trigger set_creator_author_preferences_updated_at
before update on public.creator_author_preferences
for each row execute function public.set_updated_at();

drop trigger if exists set_creator_work_meta_updated_at on public.creator_work_meta;
create trigger set_creator_work_meta_updated_at
before update on public.creator_work_meta
for each row execute function public.set_updated_at();

drop trigger if exists set_creator_episode_drafts_updated_at on public.creator_episode_drafts;
create trigger set_creator_episode_drafts_updated_at
before update on public.creator_episode_drafts
for each row execute function public.set_updated_at();

alter table public.creator_author_preferences enable row level security;
alter table public.creator_work_meta enable row level security;
alter table public.creator_episode_drafts enable row level security;
alter table public.creator_episode_history enable row level security;

drop policy if exists "Users can manage own creator preferences" on public.creator_author_preferences;
create policy "Users can manage own creator preferences"
  on public.creator_author_preferences
  for all
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id)
  with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "Users can manage own creator work meta" on public.creator_work_meta;
create policy "Users can manage own creator work meta"
  on public.creator_work_meta
  for all
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id)
  with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "Users can manage own creator drafts" on public.creator_episode_drafts;
create policy "Users can manage own creator drafts"
  on public.creator_episode_drafts
  for all
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id)
  with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "Users can view own creator history" on public.creator_episode_history;
create policy "Users can view own creator history"
  on public.creator_episode_history
  for select
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "Users can insert own creator history" on public.creator_episode_history;
create policy "Users can insert own creator history"
  on public.creator_episode_history
  for insert
  to authenticated
  with check (auth.uid() is not null and auth.uid() = user_id);
