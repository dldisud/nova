create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('reader', 'admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'novel_status') then
    create type public.novel_status as enum ('draft', 'serializing', 'completed', 'paused', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'publish_status') then
    create type public.publish_status as enum ('draft', 'published', 'hidden');
  end if;

  if not exists (select 1 from pg_type where typname = 'episode_access_type') then
    create type public.episode_access_type as enum ('free', 'paid');
  end if;

  if not exists (select 1 from pg_type where typname = 'tag_category') then
    create type public.tag_category as enum ('genre', 'theme', 'audience', 'format', 'origin', 'event');
  end if;

  if not exists (select 1 from pg_type where typname = 'event_type') then
    create type public.event_type as enum ('genre_festival', 'bundle_sale', 'completion_sale', 'translation_week', 'featured_drop');
  end if;

  if not exists (select 1 from pg_type where typname = 'event_status') then
    create type public.event_status as enum ('scheduled', 'active', 'ended');
  end if;

  if not exists (select 1 from pg_type where typname = 'library_state') then
    create type public.library_state as enum ('reading', 'completed', 'paused', 'wishlist', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'purchase_type') then
    create type public.purchase_type as enum ('episode', 'bundle');
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '새 독자',
  avatar_url text,
  role public.user_role not null default 'reader',
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.authors (
  id uuid primary key default gen_random_uuid(),
  pen_name text not null unique,
  bio text,
  country_code text,
  is_translator boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.novels (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.authors(id) on delete restrict,
  slug text not null unique,
  title text not null,
  subtitle text,
  short_description text,
  description text not null,
  cover_url text,
  banner_url text,
  status public.novel_status not null default 'draft',
  age_rating smallint not null default 15 check (age_rating in (0, 12, 15, 19)),
  is_translation boolean not null default false,
  origin_country text,
  language_code text not null default 'ko',
  free_episode_count integer not null default 0 check (free_episode_count >= 0),
  total_episode_count integer not null default 0 check (total_episode_count >= 0),
  reaction_score numeric(3,1) not null default 0 check (reaction_score >= 0 and reaction_score <= 10),
  view_count bigint not null default 0 check (view_count >= 0),
  bookmark_count bigint not null default 0 check (bookmark_count >= 0),
  comment_count bigint not null default 0 check (comment_count >= 0),
  bundle_list_price numeric(10,2) check (bundle_list_price is null or bundle_list_price >= 0),
  bundle_sale_price numeric(10,2) check (bundle_sale_price is null or bundle_sale_price >= 0),
  sale_starts_at timestamptz,
  sale_ends_at timestamptz,
  published_from timestamptz,
  published_to timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint novels_sale_price_check
    check (
      bundle_sale_price is null
      or bundle_list_price is null
      or bundle_sale_price <= bundle_list_price
    )
);

create table if not exists public.episodes (
  id uuid primary key default gen_random_uuid(),
  novel_id uuid not null references public.novels(id) on delete cascade,
  episode_number integer not null check (episode_number > 0),
  title text not null,
  teaser text,
  status public.publish_status not null default 'draft',
  access_type public.episode_access_type not null default 'free',
  price numeric(10,2),
  word_count integer not null default 0 check (word_count >= 0),
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint episodes_price_check
    check (
      (access_type = 'free' and coalesce(price, 0) = 0)
      or
      (access_type = 'paid' and price is not null and price > 0)
    ),
  unique (novel_id, episode_number)
);

create table if not exists public.episode_contents (
  episode_id uuid primary key references public.episodes(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  category public.tag_category not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.novel_tags (
  novel_id uuid not null references public.novels(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (novel_id, tag_id)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  description text,
  hero_image_url text,
  event_type public.event_type not null,
  status public.event_status not null default 'scheduled',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint events_date_check check (ends_at > starts_at)
);

create table if not exists public.event_items (
  event_id uuid not null references public.events(id) on delete cascade,
  novel_id uuid not null references public.novels(id) on delete cascade,
  sort_order integer not null default 1,
  discount_percent integer check (discount_percent is null or (discount_percent >= 0 and discount_percent <= 100)),
  sale_price numeric(10,2) check (sale_price is null or sale_price >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (event_id, novel_id)
);

create table if not exists public.library_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  novel_id uuid not null references public.novels(id) on delete cascade,
  state public.library_state not null default 'reading',
  is_bookmarked boolean not null default false,
  notifications_enabled boolean not null default true,
  last_read_episode_id uuid references public.episodes(id) on delete set null,
  last_read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, novel_id)
);

create table if not exists public.reading_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  novel_id uuid not null references public.novels(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  progress_percent numeric(5,2) not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  last_position integer not null default 0 check (last_position >= 0),
  finished_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, episode_id)
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  novel_id uuid references public.novels(id) on delete cascade,
  episode_id uuid references public.episodes(id) on delete cascade,
  purchase_type public.purchase_type not null,
  amount_paid numeric(10,2) not null default 0 check (amount_paid >= 0),
  purchased_at timestamptz not null default timezone('utc', now()),
  constraint purchases_target_check
    check (
      (purchase_type = 'episode' and episode_id is not null and novel_id is null)
      or
      (purchase_type = 'bundle' and novel_id is not null and episode_id is null)
    )
);

create unique index if not exists purchases_unique_episode_per_user
  on public.purchases(user_id, episode_id)
  where purchase_type = 'episode' and episode_id is not null;

create unique index if not exists purchases_unique_bundle_per_user
  on public.purchases(user_id, novel_id)
  where purchase_type = 'bundle' and novel_id is not null;

create index if not exists novels_status_idx on public.novels(status);
create index if not exists novels_author_idx on public.novels(author_id);
create index if not exists novels_sale_window_idx on public.novels(sale_starts_at, sale_ends_at);
create index if not exists episodes_novel_status_idx on public.episodes(novel_id, status, episode_number);
create index if not exists episode_contents_updated_idx on public.episode_contents(updated_at);
create index if not exists tags_category_idx on public.tags(category);
create index if not exists event_items_sort_idx on public.event_items(event_id, sort_order);
create index if not exists library_items_user_state_idx on public.library_items(user_id, state);
create index if not exists reading_progress_user_idx on public.reading_progress(user_id, novel_id);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_authors_updated_at on public.authors;
create trigger set_authors_updated_at
before update on public.authors
for each row execute function public.set_updated_at();

drop trigger if exists set_novels_updated_at on public.novels;
create trigger set_novels_updated_at
before update on public.novels
for each row execute function public.set_updated_at();

drop trigger if exists set_episodes_updated_at on public.episodes;
create trigger set_episodes_updated_at
before update on public.episodes
for each row execute function public.set_updated_at();

drop trigger if exists set_episode_contents_updated_at on public.episode_contents;
create trigger set_episode_contents_updated_at
before update on public.episode_contents
for each row execute function public.set_updated_at();

drop trigger if exists set_tags_updated_at on public.tags;
create trigger set_tags_updated_at
before update on public.tags
for each row execute function public.set_updated_at();

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
before update on public.events
for each row execute function public.set_updated_at();

drop trigger if exists set_library_items_updated_at on public.library_items;
create trigger set_library_items_updated_at
before update on public.library_items
for each row execute function public.set_updated_at();

drop trigger if exists set_reading_progress_updated_at on public.reading_progress;
create trigger set_reading_progress_updated_at
before update on public.reading_progress
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), '새 독자')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.authors enable row level security;
alter table public.novels enable row level security;
alter table public.episodes enable row level security;
alter table public.episode_contents enable row level security;
alter table public.tags enable row level security;
alter table public.novel_tags enable row level security;
alter table public.events enable row level security;
alter table public.event_items enable row level security;
alter table public.library_items enable row level security;
alter table public.reading_progress enable row level security;
alter table public.purchases enable row level security;

drop policy if exists "Public can view authors" on public.authors;
create policy "Public can view authors"
  on public.authors
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can view published novels" on public.novels;
create policy "Public can view published novels"
  on public.novels
  for select
  to anon, authenticated
  using (status <> 'draft');

drop policy if exists "Public can view published episodes" on public.episodes;
create policy "Public can view published episodes"
  on public.episodes
  for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "Public can view free episode contents" on public.episode_contents;
create policy "Public can view free episode contents"
  on public.episode_contents
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.episodes e
      where e.id = episode_id
        and e.status = 'published'
        and e.access_type = 'free'
    )
  );

drop policy if exists "Users can view purchased episode contents" on public.episode_contents;
create policy "Users can view purchased episode contents"
  on public.episode_contents
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.episodes e
      where e.id = episode_id
        and e.status = 'published'
        and (
          e.access_type = 'free'
          or exists (
            select 1
            from public.purchases p
            where p.user_id = auth.uid()
              and (
                (p.purchase_type = 'episode' and p.episode_id = e.id)
                or
                (p.purchase_type = 'bundle' and p.novel_id = e.novel_id)
              )
          )
        )
    )
  );

drop policy if exists "Public can view tags" on public.tags;
create policy "Public can view tags"
  on public.tags
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can view novel tags" on public.novel_tags;
create policy "Public can view novel tags"
  on public.novel_tags
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can view live events" on public.events;
create policy "Public can view live events"
  on public.events
  for select
  to anon, authenticated
  using (status <> 'scheduled');

drop policy if exists "Public can view event items" on public.event_items;
create policy "Public can view event items"
  on public.event_items
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.events e
      where e.id = event_id
        and e.status <> 'scheduled'
    )
  );

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() is not null and auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() is not null and auth.uid() = id)
  with check (
    auth.uid() is not null
    and auth.uid() = id
    and role = 'reader'
  );

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check (
    auth.uid() is not null
    and auth.uid() = id
    and role = 'reader'
  );

drop policy if exists "Users can manage own library" on public.library_items;
create policy "Users can manage own library"
  on public.library_items
  for all
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id)
  with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "Users can manage own progress" on public.reading_progress;
create policy "Users can manage own progress"
  on public.reading_progress
  for all
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id)
  with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "Users can view own purchases" on public.purchases;
create policy "Users can view own purchases"
  on public.purchases
  for select
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);
