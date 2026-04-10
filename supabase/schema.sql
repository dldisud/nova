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

alter type public.publish_status add value if not exists 'trashed';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.sync_novel_episode_counts(p_novel_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_novel_id is null then
    return;
  end if;

  update public.novels
  set
    total_episode_count = (
      select count(*)
      from public.episodes e
      where e.novel_id = p_novel_id
        and e.status <> 'trashed'::public.publish_status
    ),
    free_episode_count = (
      select count(*)
      from public.episodes e
      where e.novel_id = p_novel_id
        and e.status <> 'trashed'::public.publish_status
        and e.access_type = 'free'::public.episode_access_type
    ),
    updated_at = timezone('utc', now())
  where id = p_novel_id;
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

alter table if exists public.authors
  add column if not exists user_id uuid references auth.users(id) on delete set null;

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

alter table if exists public.novels
  add column if not exists archived_from_status public.novel_status;

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
create unique index if not exists authors_user_id_uidx on public.authors(user_id)
  where user_id is not null;

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

create or replace function public.purchase_episode(p_episode_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  episode_row public.episodes%rowtype;
  novel_row public.novels%rowtype;
  already_owned boolean := false;
  sale_percent integer := 0;
  base_amount numeric(10,2) := 300;
  final_amount numeric(10,2) := 300;
  now_utc timestamptz := timezone('utc', now());
begin
  if current_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select *
  into episode_row
  from public.episodes
  where id = p_episode_id
    and status = 'published';

  if not found then
    raise exception '존재하지 않는 회차입니다.';
  end if;

  if episode_row.access_type <> 'paid' then
    raise exception '무료 회차는 구매할 수 없습니다.';
  end if;

  select *
  into novel_row
  from public.novels
  where id = episode_row.novel_id;

  if not found then
    raise exception '작품 정보를 찾을 수 없습니다.';
  end if;

  select exists (
    select 1
    from public.purchases p
    where p.user_id = current_user_id
      and (
        (p.purchase_type = 'episode' and p.episode_id = episode_row.id)
        or
        (p.purchase_type = 'bundle' and p.novel_id = episode_row.novel_id)
      )
  )
  into already_owned;

  if coalesce(novel_row.bundle_list_price, 0) > 0
     and coalesce(novel_row.bundle_sale_price, 0) > 0
     and novel_row.bundle_sale_price < novel_row.bundle_list_price
     and novel_row.sale_starts_at is not null
     and novel_row.sale_ends_at is not null
     and now_utc >= novel_row.sale_starts_at
     and now_utc < novel_row.sale_ends_at then
    sale_percent := round(((novel_row.bundle_list_price - novel_row.bundle_sale_price) / novel_row.bundle_list_price) * 100);
  end if;

  base_amount := coalesce(episode_row.price, 300);
  if sale_percent > 0 then
    final_amount := greatest(100, round((base_amount * (100 - sale_percent)) / 100.0));
  else
    final_amount := base_amount;
  end if;

  if not already_owned then
    insert into public.purchases (
      user_id,
      episode_id,
      purchase_type,
      amount_paid,
      purchased_at
    )
    values (
      current_user_id,
      episode_row.id,
      'episode',
      final_amount,
      now_utc
    )
    on conflict do nothing;
  end if;

  insert into public.library_items (
    user_id,
    novel_id,
    state,
    last_read_episode_id,
    last_read_at
  )
  values (
    current_user_id,
    episode_row.novel_id,
    'reading',
    episode_row.id,
    now_utc
  )
  on conflict (user_id, novel_id) do update
  set
    state = 'reading',
    last_read_episode_id = excluded.last_read_episode_id,
    last_read_at = excluded.last_read_at,
    updated_at = timezone('utc', now());

  return jsonb_build_object(
    'ok', true,
    'already_owned', already_owned,
    'episode_id', episode_row.id,
    'episode_number', episode_row.episode_number,
    'novel_id', episode_row.novel_id,
    'novel_slug', novel_row.slug,
    'amount_paid', final_amount
  );
end;
$$;

create or replace function public.link_author_user_for_admin(
  p_author_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  is_admin boolean := false;
  current_linked_user_id uuid;
  linked_author_id uuid;
  linked_user_id uuid;
begin
  if current_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if p_author_id is null or p_user_id is null then
    raise exception '연결 정보를 확인해 주세요.';
  end if;

  select exists (
    select 1
    from public.profiles
    where id = current_user_id
      and role = 'admin'
  )
  into is_admin;

  if not is_admin then
    raise exception '관리자 권한이 필요합니다.';
  end if;

  if not exists (
    select 1
    from auth.users
    where id = p_user_id
  ) then
    raise exception '사용자 정보를 찾을 수 없습니다.';
  end if;

  select a.user_id
  into current_linked_user_id
  from public.authors a
  where a.id = p_author_id
  for update;

  if not found then
    raise exception '작가 정보를 찾을 수 없습니다.';
  end if;

  if current_linked_user_id is not null and current_linked_user_id <> p_user_id then
    raise exception '이미 다른 계정에 연결된 작가입니다.';
  end if;

  update public.authors
  set user_id = p_user_id
  where id = p_author_id
    and (user_id is null or user_id = p_user_id)
  returning id, user_id into linked_author_id, linked_user_id;

  if not found then
    raise exception '연결 정보를 확인해 주세요.';
  end if;

  return jsonb_build_object(
    'ok', true,
    'author_id', linked_author_id,
    'user_id', linked_user_id
  );
end;
$$;

create or replace function public.get_owned_novel_edit_payload_for_author(
  p_novel_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  novel_row public.novels%rowtype;
  owner_user_id uuid;
  tag_names text[] := '{}'::text[];
begin
  if current_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if p_novel_id is null then
    raise exception '작품 정보를 찾을 수 없습니다.';
  end if;

  select n.*
  into novel_row
  from public.novels n
  where n.id = p_novel_id;

  if not found then
    raise exception '작품 정보를 찾을 수 없습니다.';
  end if;

  select a.user_id
  into owner_user_id
  from public.authors a
  where a.id = novel_row.author_id;

  if owner_user_id is null or owner_user_id <> current_user_id then
    raise exception '본인 작품만 수정할 수 있습니다.';
  end if;

  select array_agg(t.name order by t.name)
  into tag_names
  from public.novel_tags nt
  join public.tags t on t.id = nt.tag_id
  where nt.novel_id = p_novel_id;

  return jsonb_build_object(
    'novel_id', novel_row.id,
    'novel_slug', novel_row.slug,
    'title', novel_row.title,
    'subtitle', novel_row.subtitle,
    'short_description', novel_row.short_description,
    'description', novel_row.description,
    'cover_url', novel_row.cover_url,
    'banner_url', novel_row.banner_url,
    'status', novel_row.status,
    'age_rating', novel_row.age_rating,
    'is_translation', novel_row.is_translation,
    'origin_country', novel_row.origin_country,
    'language_code', novel_row.language_code,
    'tags', coalesce(tag_names, '{}'::text[])
  );
end;
$$;

create or replace function public.update_novel_for_author(
  p_novel_id uuid,
  p_title text,
  p_subtitle text,
  p_short_description text,
  p_description text,
  p_cover_url text,
  p_banner_url text,
  p_status public.novel_status,
  p_age_rating smallint,
  p_is_translation boolean,
  p_origin_country text,
  p_language_code text,
  p_tags text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  has_ownership boolean := false;
  updated_novel_slug text;
  updated_novel_at timestamptz;
begin
  if current_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select exists (
    select 1
    from public.novels n
    join public.authors a on a.id = n.author_id
    where n.id = p_novel_id
      and n.author_id = a.id
      and a.user_id = current_user_id
  )
  into has_ownership;

  if not has_ownership then
    raise exception '본인 작품만 수정할 수 있습니다.';
  end if;

  update public.novels
  set
    title = coalesce(nullif(trim(p_title), ''), title),
    subtitle = coalesce(p_subtitle, subtitle),
    short_description = coalesce(p_short_description, short_description),
    description = coalesce(nullif(trim(p_description), ''), description),
    cover_url = coalesce(p_cover_url, cover_url),
    banner_url = coalesce(p_banner_url, banner_url),
    status = coalesce(p_status, status),
    age_rating = coalesce(p_age_rating, age_rating),
    is_translation = coalesce(p_is_translation, is_translation),
    origin_country = coalesce(p_origin_country, origin_country),
    language_code = coalesce(nullif(trim(p_language_code), ''), language_code)
  where id = p_novel_id
  returning slug, updated_at into updated_novel_slug, updated_novel_at;

  if not found then
    raise exception '작품 정보를 찾을 수 없습니다.';
  end if;

  if p_tags is not null then
    insert into public.tags (slug, name, category)
    select
      regexp_replace(lower(normalized_tags.tag_name), '[^a-z0-9]+', '-', 'g') as slug,
      normalized_tags.tag_name,
      'theme'
    from (
      select distinct nullif(trim(input_tag.tag_name), '') as tag_name
      from unnest(p_tags) as input_tag(tag_name)
    ) normalized_tags
    where normalized_tags.tag_name is not null
      and normalized_tags.tag_name <> ''
    on conflict (slug) do update
    set name = excluded.name;

    delete from public.novel_tags
    where novel_id = p_novel_id;

    insert into public.novel_tags (novel_id, tag_id)
    select p_novel_id, t.id
    from (
      select distinct nullif(trim(input_tag.tag_name), '') as tag_name
      from unnest(p_tags) as input_tag(tag_name)
    ) normalized_tags
    join public.tags t on lower(t.name) = lower(normalized_tags.tag_name)
    where normalized_tags.tag_name is not null
    on conflict do nothing;
  end if;

  return jsonb_build_object(
    'ok', true,
    'novel_id', p_novel_id,
    'novel_slug', updated_novel_slug,
    'updated_at', updated_novel_at
  );
end;
$$;

create or replace function public.update_episode_for_author(
  p_episode_id uuid,
  p_title text,
  p_body text,
  p_access_type public.episode_access_type,
  p_price numeric(10,2)
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  has_ownership boolean := false;
  episode_row public.episodes%rowtype;
  next_access_type public.episode_access_type;
  next_price numeric(10,2);
  episode_novel_slug text;
  episode_updated_at timestamptz;
begin
  if current_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select exists (
    select 1
    from public.episodes e
    join public.novels n on n.id = e.novel_id
    join public.authors a on a.id = n.author_id
    where e.id = p_episode_id
      and n.author_id = a.id
      and a.user_id = current_user_id
  )
  into has_ownership;

  if not has_ownership then
    raise exception '본인 작품만 수정할 수 있습니다.';
  end if;

  select e.*
  into episode_row
  from public.episodes e
  where e.id = p_episode_id;

  if not found then
    raise exception '회차 정보를 찾을 수 없습니다.';
  end if;

  select n.slug
  into episode_novel_slug
  from public.novels n
  where n.id = episode_row.novel_id;

  if p_body is null or trim(p_body) = '' then
    raise exception '회차 본문을 입력해 주세요.';
  end if;

  next_access_type := coalesce(p_access_type, episode_row.access_type);
  if next_access_type = 'free' then
    next_price := 0;
  else
    next_price := coalesce(p_price, episode_row.price);
  end if;

  if next_access_type = 'paid' and (next_price is null or next_price <= 0) then
    raise exception '유료 회차 가격을 확인해 주세요.';
  end if;

  update public.episodes
  set
    title = coalesce(nullif(trim(p_title), ''), title),
    access_type = next_access_type,
    price = next_price
  where id = p_episode_id
  returning updated_at into episode_updated_at;

  insert into public.episode_contents (episode_id, body)
  values (p_episode_id, p_body)
  on conflict (episode_id) do update
  set
    body = excluded.body,
    updated_at = timezone('utc', now());

  return jsonb_build_object(
    'ok', true,
    'episode_id', p_episode_id,
    'novel_slug', episode_novel_slug,
    'episode_number', episode_row.episode_number,
    'updated_at', episode_updated_at
  );
end;
$$;

create or replace function public.upsert_novel_sale_for_author(
  p_novel_id uuid,
  p_discount_percent integer,
  p_sale_starts_at timestamptz,
  p_sale_ends_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  has_ownership boolean := false;
  novel_row public.novels%rowtype;
  now_utc timestamptz := timezone('utc', now());
  next_status public.event_status;
  event_slug text;
  target_event_id uuid;
  sale_price numeric(10,2);
begin
  if current_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if p_sale_starts_at is null or p_sale_ends_at is null or p_sale_ends_at <= p_sale_starts_at then
    raise exception '할인 기간을 다시 확인해 주세요.';
  end if;

  if p_discount_percent is null or p_discount_percent <= 0 or p_discount_percent >= 100 then
    raise exception '할인율을 다시 확인해 주세요.';
  end if;

  select exists (
    select 1
    from public.novels n
    join public.authors a on a.id = n.author_id
    where n.id = p_novel_id
      and n.author_id = a.id
      and a.user_id = current_user_id
  )
  into has_ownership;

  if not has_ownership then
    raise exception '본인 작품만 수정할 수 있습니다.';
  end if;

  select *
  into novel_row
  from public.novels
  where id = p_novel_id;

  if not found then
    raise exception '작품 정보를 찾을 수 없습니다.';
  end if;

  if novel_row.bundle_list_price is null or novel_row.bundle_list_price <= 0 then
    raise exception '정가를 먼저 입력해 주세요.';
  end if;

  sale_price := round((novel_row.bundle_list_price * (100 - p_discount_percent)) / 100.0, 2);
  if sale_price <= 0 or sale_price >= novel_row.bundle_list_price then
    raise exception '할인율을 다시 확인해 주세요.';
  end if;

  next_status := case
    when now_utc < p_sale_starts_at then 'scheduled'::public.event_status
    when now_utc >= p_sale_ends_at then 'ended'::public.event_status
    else 'active'::public.event_status
  end;

  update public.novels
  set
    bundle_sale_price = sale_price,
    sale_starts_at = p_sale_starts_at,
    sale_ends_at = p_sale_ends_at
  where id = p_novel_id;

  event_slug := 'bundle-sale-single-' || replace(p_novel_id::text, '-', '');

  insert into public.events (
    slug,
    title,
    subtitle,
    description,
    event_type,
    status,
    starts_at,
    ends_at
  )
  values (
    event_slug,
    novel_row.title || ' 묶음 할인',
    novel_row.title,
    '단일 작품 할인 이벤트',
    'bundle_sale',
    next_status,
    p_sale_starts_at,
    p_sale_ends_at
  )
  on conflict (slug) do update
  set
    title = excluded.title,
    subtitle = excluded.subtitle,
    description = excluded.description,
    event_type = 'bundle_sale',
    status = excluded.status,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    updated_at = timezone('utc', now())
  returning id into target_event_id;

  delete from public.event_items
  where event_id = target_event_id
    and novel_id <> p_novel_id;

  insert into public.event_items (
    event_id,
    novel_id,
    sort_order,
    discount_percent,
    sale_price
  )
  values (
    target_event_id,
    p_novel_id,
    1,
    p_discount_percent,
    sale_price
  )
  on conflict (event_id, novel_id) do update
  set
    sort_order = 1,
    discount_percent = excluded.discount_percent,
    sale_price = excluded.sale_price;

  return jsonb_build_object(
    'ok', true,
    'novel_id', p_novel_id,
    'event_id', target_event_id,
    'event_slug', event_slug,
    'event_status', next_status,
    'discount_percent', p_discount_percent,
    'sale_price', sale_price,
    'sale_starts_at', p_sale_starts_at,
    'sale_ends_at', p_sale_ends_at
  );
end;
$$;

create or replace function public.clear_novel_sale_for_author(
  p_novel_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  has_ownership boolean := false;
  novel_row public.novels%rowtype;
  now_utc timestamptz := timezone('utc', now());
  event_slug text;
  target_event_id uuid;
begin
  if current_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select exists (
    select 1
    from public.novels n
    join public.authors a on a.id = n.author_id
    where n.id = p_novel_id
      and n.author_id = a.id
      and a.user_id = current_user_id
  )
  into has_ownership;

  if not has_ownership then
    raise exception '본인 작품만 수정할 수 있습니다.';
  end if;

  select *
  into novel_row
  from public.novels
  where id = p_novel_id;

  if not found then
    raise exception '작품 정보를 찾을 수 없습니다.';
  end if;

  update public.novels
  set
    bundle_sale_price = null,
    sale_starts_at = null,
    sale_ends_at = null,
    updated_at = now_utc
  where id = p_novel_id;

  event_slug := 'bundle-sale-single-' || replace(p_novel_id::text, '-', '');

  update public.events
  set
    status = 'ended'::public.event_status,
    ends_at = greatest(coalesce(ends_at, now_utc), now_utc),
    updated_at = now_utc
  where slug = event_slug
    and event_type = 'bundle_sale'
  returning id into target_event_id;

  if target_event_id is not null then
    delete from public.event_items
    where event_id = target_event_id
      and novel_id = p_novel_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'novel_id', p_novel_id,
    'event_id', target_event_id,
    'event_slug', event_slug,
    'cleared_at', now_utc
  );
end;
$$;

create or replace function public.archive_novel_for_author(
  p_novel_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  has_ownership boolean := false;
  now_utc timestamptz := timezone('utc', now());
  hidden_episode_count integer := 0;
  event_slug text;
  target_event_id uuid;
begin
  if current_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select exists (
    select 1
    from public.novels n
    join public.authors a on a.id = n.author_id
    where n.id = p_novel_id
      and n.author_id = a.id
      and a.user_id = current_user_id
  )
  into has_ownership;

  if not has_ownership then
    raise exception '본인 작품만 수정할 수 있습니다.';
  end if;

  update public.novels
  set
    archived_from_status = case
      when status = 'archived'::public.novel_status then coalesce(archived_from_status, 'serializing'::public.novel_status)
      else status
    end,
    status = 'archived'::public.novel_status,
    bundle_sale_price = null,
    sale_starts_at = null,
    sale_ends_at = null,
    updated_at = now_utc
  where id = p_novel_id;

  if not found then
    raise exception '작품 정보를 찾을 수 없습니다.';
  end if;

  update public.episodes
  set
    status = 'hidden'::public.publish_status,
    updated_at = now_utc
  where novel_id = p_novel_id
    and status = 'published';

  get diagnostics hidden_episode_count = row_count;

  event_slug := 'bundle-sale-single-' || replace(p_novel_id::text, '-', '');

  update public.events
  set
    status = 'ended'::public.event_status,
    ends_at = greatest(coalesce(ends_at, now_utc), now_utc),
    updated_at = now_utc
  where slug = event_slug
    and event_type = 'bundle_sale'
  returning id into target_event_id;

  if target_event_id is not null then
    delete from public.event_items
    where event_id = target_event_id
      and novel_id = p_novel_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'novel_id', p_novel_id,
    'status', 'archived',
    'hidden_episode_count', hidden_episode_count,
    'event_id', target_event_id,
    'event_slug', event_slug,
    'archived_at', now_utc
  );
end;
$$;

create or replace function public.unarchive_novel_for_author(
  p_novel_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  novel_row public.novels%rowtype;
  restored_status public.novel_status;
  now_utc timestamptz := timezone('utc', now());
begin
  if current_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select n.*
  into novel_row
  from public.novels n
  join public.authors a on a.id = n.author_id
  where n.id = p_novel_id
    and a.user_id = current_user_id;

  if not found then
    if exists (select 1 from public.novels where id = p_novel_id) then
      raise exception '본인 작품만 수정할 수 있습니다.';
    end if;
    raise exception '작품 정보를 찾을 수 없습니다.';
  end if;

  if novel_row.status <> 'archived'::public.novel_status then
    raise exception '보관된 작품만 다시 공개할 수 있습니다.';
  end if;

  restored_status := coalesce(
    novel_row.archived_from_status,
    case
      when novel_row.total_episode_count > 0 then 'serializing'::public.novel_status
      else 'draft'::public.novel_status
    end
  );

  update public.novels
  set
    status = restored_status,
    archived_from_status = null,
    updated_at = now_utc
  where id = p_novel_id;

  return jsonb_build_object(
    'ok', true,
    'novel_id', p_novel_id,
    'status', restored_status,
    'unarchived_at', now_utc
  );
end;
$$;

create or replace function public.hide_episode_for_author(
  p_episode_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  episode_row public.episodes%rowtype;
  novel_slug_value text;
  now_utc timestamptz := timezone('utc', now());
begin
  if current_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select e.*
  into episode_row
  from public.episodes e
  join public.novels n on n.id = e.novel_id
  join public.authors a on a.id = n.author_id
  where e.id = p_episode_id
    and a.user_id = current_user_id;

  if not found then
    if exists (select 1 from public.episodes where id = p_episode_id) then
      raise exception '본인 회차만 수정할 수 있습니다.';
    end if;
    raise exception '회차 정보를 찾을 수 없습니다.';
  end if;

  select n.slug
  into novel_slug_value
  from public.novels n
  where n.id = episode_row.novel_id;

  update public.episodes
  set
    status = 'hidden'::public.publish_status,
    updated_at = now_utc
  where id = p_episode_id;

  return jsonb_build_object(
    'ok', true,
    'episode_id', p_episode_id,
    'novel_id', episode_row.novel_id,
    'novel_slug', novel_slug_value,
    'status', 'hidden',
    'hidden_at', now_utc
  );
end;
$$;

create or replace function public.unhide_episode_for_author(
  p_episode_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  episode_row public.episodes%rowtype;
  novel_slug_value text;
  novel_status_value public.novel_status;
  now_utc timestamptz := timezone('utc', now());
begin
  if current_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select e.*
  into episode_row
  from public.episodes e
  join public.novels n on n.id = e.novel_id
  join public.authors a on a.id = n.author_id
  where e.id = p_episode_id
    and a.user_id = current_user_id;

  if not found then
    if exists (select 1 from public.episodes where id = p_episode_id) then
      raise exception '본인 회차만 수정할 수 있습니다.';
    end if;
    raise exception '회차 정보를 찾을 수 없습니다.';
  end if;

  select n.slug, n.status
  into novel_slug_value, novel_status_value
  from public.novels n
  where n.id = episode_row.novel_id;

  if novel_status_value = 'archived'::public.novel_status then
    raise exception '작품 보관을 먼저 해제해 주세요.';
  end if;

  if episode_row.status <> 'hidden'::public.publish_status then
    raise exception '숨겨진 회차만 다시 공개할 수 있습니다.';
  end if;

  update public.episodes
  set
    status = 'published'::public.publish_status,
    published_at = coalesce(published_at, now_utc),
    updated_at = now_utc
  where id = p_episode_id;

  return jsonb_build_object(
    'ok', true,
    'episode_id', p_episode_id,
    'novel_id', episode_row.novel_id,
    'novel_slug', novel_slug_value,
    'status', 'published',
    'published_at', coalesce(episode_row.published_at, now_utc),
    'unhidden_at', now_utc
  );
end;
$$;

create or replace function public.trash_episode_for_author(
  p_episode_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  episode_row public.episodes%rowtype;
  novel_slug_value text;
  now_utc timestamptz := timezone('utc', now());
begin
  if current_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select e.*
  into episode_row
  from public.episodes e
  join public.novels n on n.id = e.novel_id
  join public.authors a on a.id = n.author_id
  where e.id = p_episode_id
    and a.user_id = current_user_id;

  if not found then
    if exists (select 1 from public.episodes where id = p_episode_id) then
      raise exception '본인 회차만 수정할 수 있습니다.';
    end if;
    raise exception '회차 정보를 찾을 수 없습니다.';
  end if;

  select n.slug
  into novel_slug_value
  from public.novels n
  where n.id = episode_row.novel_id;

  if episode_row.status = 'trashed'::public.publish_status then
    raise exception '이미 휴지통에 있는 회차입니다.';
  end if;

  update public.episodes
  set
    status = 'trashed'::public.publish_status,
    updated_at = now_utc
  where id = p_episode_id;

  perform public.sync_novel_episode_counts(episode_row.novel_id);

  return jsonb_build_object(
    'ok', true,
    'episode_id', p_episode_id,
    'novel_id', episode_row.novel_id,
    'novel_slug', novel_slug_value,
    'status', 'trashed',
    'trashed_at', now_utc
  );
end;
$$;

create or replace function public.restore_trashed_episode_for_author(
  p_episode_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  episode_row public.episodes%rowtype;
  novel_slug_value text;
  now_utc timestamptz := timezone('utc', now());
begin
  if current_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select e.*
  into episode_row
  from public.episodes e
  join public.novels n on n.id = e.novel_id
  join public.authors a on a.id = n.author_id
  where e.id = p_episode_id
    and a.user_id = current_user_id;

  if not found then
    if exists (select 1 from public.episodes where id = p_episode_id) then
      raise exception '본인 회차만 수정할 수 있습니다.';
    end if;
    raise exception '회차 정보를 찾을 수 없습니다.';
  end if;

  select n.slug
  into novel_slug_value
  from public.novels n
  where n.id = episode_row.novel_id;

  if episode_row.status <> 'trashed'::public.publish_status then
    raise exception '휴지통에 있는 회차만 복원할 수 있습니다.';
  end if;

  update public.episodes
  set
    status = 'hidden'::public.publish_status,
    updated_at = now_utc
  where id = p_episode_id;

  perform public.sync_novel_episode_counts(episode_row.novel_id);

  return jsonb_build_object(
    'ok', true,
    'episode_id', p_episode_id,
    'novel_id', episode_row.novel_id,
    'novel_slug', novel_slug_value,
    'status', 'hidden',
    'restored_at', now_utc
  );
end;
$$;

create or replace function public.restore_all_trashed_episodes_for_author(
  p_novel_slug text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_novel_id uuid;
  target_novel_slug text;
  restored_count integer := 0;
  total_count integer := 0;
  free_count integer := 0;
begin
  if current_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select n.id, n.slug
  into target_novel_id, target_novel_slug
  from public.novels n
  join public.authors a on a.id = n.author_id
  where n.slug = p_novel_slug
    and a.user_id = current_user_id;

  if not found then
    if exists (select 1 from public.novels where slug = p_novel_slug) then
      raise exception '본인 작품만 수정할 수 있습니다.';
    end if;
    raise exception '작품 정보를 찾을 수 없습니다.';
  end if;

  update public.episodes e
  set
    status = 'hidden'::public.publish_status,
    updated_at = timezone('utc', now())
  where e.novel_id = target_novel_id
    and e.status = 'trashed'::public.publish_status;

  get diagnostics restored_count = row_count;

  perform public.sync_novel_episode_counts(target_novel_id);

  select total_episode_count, free_episode_count
  into total_count, free_count
  from public.novels
  where id = target_novel_id;

  return jsonb_build_object(
    'ok', true,
    'novel_id', target_novel_id,
    'novel_slug', target_novel_slug,
    'restored_count', restored_count,
    'total_episode_count', total_count,
    'free_episode_count', free_count
  );
end;
$$;

create or replace function public.purge_trashed_episodes_for_author(
  p_novel_slug text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_novel_id uuid;
  target_novel_slug text;
  purged_count integer := 0;
  total_count integer := 0;
  free_count integer := 0;
begin
  if current_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select n.id, n.slug
  into target_novel_id, target_novel_slug
  from public.novels n
  join public.authors a on a.id = n.author_id
  where n.slug = p_novel_slug
    and a.user_id = current_user_id;

  if not found then
    if exists (select 1 from public.novels where slug = p_novel_slug) then
      raise exception '본인 작품만 수정할 수 있습니다.';
    end if;
    raise exception '작품 정보를 찾을 수 없습니다.';
  end if;

  delete from public.episodes
  where novel_id = target_novel_id
    and status = 'trashed'::public.publish_status;

  get diagnostics purged_count = row_count;

  perform public.sync_novel_episode_counts(target_novel_id);

  select total_episode_count, free_episode_count
  into total_count, free_count
  from public.novels
  where id = target_novel_id;

  return jsonb_build_object(
    'ok', true,
    'novel_id', target_novel_id,
    'novel_slug', target_novel_slug,
    'purged_count', purged_count,
    'total_episode_count', total_count,
    'free_episode_count', free_count
  );
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
  using (status <> 'draft' and status <> 'archived');

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

create or replace function public.list_owned_episodes_for_author(
  p_novel_slug text default null
)
returns table(
  episode_id uuid,
  novel_id uuid,
  novel_slug text,
  episode_number integer,
  title text,
  status public.publish_status,
  access_type public.episode_access_type,
  price numeric,
  updated_at timestamptz,
  published_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  return query
  select
    e.id as episode_id,
    n.id as novel_id,
    n.slug as novel_slug,
    e.episode_number,
    e.title,
    e.status,
    e.access_type,
    e.price,
    e.updated_at,
    e.published_at
  from public.episodes e
  join public.novels n on n.id = e.novel_id
  join public.authors a on a.id = n.author_id
  where a.user_id = current_user_id
    and (p_novel_slug is null or n.slug = p_novel_slug)
  order by n.updated_at desc, e.episode_number desc;
end;
$$;

create or replace function public.get_owned_episode_edit_payload_for_author(
  p_episode_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  payload jsonb;
begin
  if current_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if p_episode_id is null then
    raise exception '회차 정보를 찾을 수 없습니다.';
  end if;

  select jsonb_build_object(
    'episode_id', e.id,
    'episode_number', e.episode_number,
    'title', e.title,
    'status', e.status,
    'access_type', e.access_type,
    'price', e.price,
    'updated_at', e.updated_at,
    'body', ec.body,
    'novel_id', n.id,
    'novel_slug', n.slug,
    'novel_title', n.title
  )
  into payload
  from public.episodes e
  join public.novels n on n.id = e.novel_id
  join public.authors a on a.id = n.author_id
  left join public.episode_contents ec on ec.episode_id = e.id
  where e.id = p_episode_id
    and a.user_id = current_user_id;

  if payload is null then
    if exists (select 1 from public.episodes where id = p_episode_id) then
      raise exception '본인 회차만 수정할 수 있습니다.';
    end if;
    raise exception '회차 정보를 찾을 수 없습니다.';
  end if;

  return payload;
end;
$$;
