-- ============================================
-- INKROAD - User Profiles & Retention Rate
-- ============================================

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  pen_name text,
  bio text,
  notify_comments boolean not null default true,
  notify_replies boolean not null default true,
  notify_likes boolean not null default true,
  notify_sales boolean not null default true,
  notify_purchases boolean not null default true,
  notify_email boolean not null default false,
  language text not null default 'ko',
  author_mode text not null default 'creator',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_profiles enable row level security;

drop policy if exists "Users can view own user profile" on public.user_profiles;
create policy "Users can view own user profile"
  on public.user_profiles
  for select
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "Users can update own user profile" on public.user_profiles;
create policy "Users can update own user profile"
  on public.user_profiles
  for update
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id)
  with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "Users can insert own user profile" on public.user_profiles;
create policy "Users can insert own user profile"
  on public.user_profiles
  for insert
  to authenticated
  with check (auth.uid() is not null and auth.uid() = user_id);

create or replace function public.get_novel_retention_rate(p_novel_id uuid)
returns table (
  retention_rate double precision,
  first_chapter_readers bigint,
  last_chapter_readers bigint
)
language plpgsql
stable
set search_path = public
as $$
declare
  v_first_ep_id uuid;
  v_last_ep_id uuid;
  v_first_readers bigint := 0;
  v_last_readers bigint := 0;
begin
  select e.id
  into v_first_ep_id
  from public.episodes e
  where e.novel_id = p_novel_id
    and e.status = 'published'::public.publish_status
  order by e.episode_number asc
  limit 1;

  select e.id
  into v_last_ep_id
  from public.episodes e
  where e.novel_id = p_novel_id
    and e.status = 'published'::public.publish_status
  order by e.episode_number desc
  limit 1;

  if v_first_ep_id is null or v_last_ep_id is null then
    return query select 0.0::double precision, 0::bigint, 0::bigint;
    return;
  end if;

  select count(distinct rp.user_id)
  into v_first_readers
  from public.reading_progress rp
  where rp.episode_id = v_first_ep_id;

  select count(distinct rp.user_id)
  into v_last_readers
  from public.reading_progress rp
  where rp.episode_id = v_last_ep_id;

  if coalesce(v_first_readers, 0) = 0 then
    return query select 0.0::double precision, 0::bigint, 0::bigint;
    return;
  end if;

  return query
  select
    round((coalesce(v_last_readers, 0)::double precision / v_first_readers::double precision) * 100.0, 1),
    coalesce(v_first_readers, 0),
    coalesce(v_last_readers, 0);
end;
$$;

create or replace function public.get_novel_stats_with_retention(p_user_id uuid)
returns table (
  novel_id uuid,
  title text,
  slug text,
  view_count bigint,
  bookmark_count bigint,
  comment_count bigint,
  avg_rating double precision,
  retention_rate double precision,
  first_chapter_readers bigint,
  last_chapter_readers bigint,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  select
    n.id as novel_id,
    n.title,
    n.slug,
    coalesce(n.view_count, 0)::bigint as view_count,
    (
      select count(*)
      from public.library_items li
      where li.novel_id = n.id
        and li.is_bookmarked = true
    )::bigint as bookmark_count,
    coalesce(n.comment_count, 0)::bigint as comment_count,
    coalesce(n.reaction_score, 0)::double precision as avg_rating,
    coalesce(ret.retention_rate, 0)::double precision as retention_rate,
    coalesce(ret.first_chapter_readers, 0)::bigint as first_chapter_readers,
    coalesce(ret.last_chapter_readers, 0)::bigint as last_chapter_readers,
    n.updated_at
  from public.novels n
  join public.authors a on a.id = n.author_id
  left join lateral public.get_novel_retention_rate(n.id) ret on true
  where a.user_id = p_user_id
  order by n.updated_at desc;
end;
$$;

grant usage on schema public to anon, authenticated;
grant all on public.user_profiles to authenticated;
grant execute on function public.get_novel_retention_rate(uuid) to anon, authenticated;
grant execute on function public.get_novel_stats_with_retention(uuid) to authenticated;

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
create trigger set_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

-- ============================================
-- RPC Functions for Novel/Episode Creation
-- ============================================

-- Create novel with first episode
create or replace function public.create_novel_with_episode(
  p_user_id uuid,
  p_title text,
  p_slug text,
  p_short_description text,
  p_age_rating int,
  p_origin_country text,
  p_is_translation boolean,
  p_cover_url text,
  p_tags text[],
  p_episode_title text,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_novel_id uuid;
  v_episode_id uuid;
begin
  insert into public.novels (
    user_id, title, slug, short_description, age_rating,
    origin_country, is_translation, cover_url, tags,
    total_episode_count, free_episode_count, view_count,
    reaction_score, status
  ) values (
    p_user_id, p_title, p_slug, p_short_description, p_age_rating,
    p_origin_country, p_is_translation, p_cover_url, p_tags,
    1, 1, 0, 0, 'serializing'
  ) returning id into v_novel_id;

  insert into public.episodes (
    novel_id, title, episode_number, body,
    is_free, status, view_count
  ) values (
    v_novel_id, p_episode_title, 1, p_body,
    true, 'published', 0
  ) returning id into v_episode_id;

  return jsonb_build_object(
    'novel_id', v_novel_id,
    'episode_id', v_episode_id,
    'slug', p_slug
  );
end;
$$;

-- Create episode for author's novel
create or replace function public.create_episode_for_author_novel(
  p_user_id uuid,
  p_novel_id uuid,
  p_title text,
  p_body text,
  p_is_free boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_episode_number int;
  v_episode_id uuid;
begin
  if not exists (select 1 from public.novels where id = p_novel_id and user_id = p_user_id) then
    raise exception '노벨을 찾을 수 없거나 권한이 없습니다.';
  end if;

  select coalesce(max(episode_number), 0) + 1 into v_episode_number
  from public.episodes
  where novel_id = p_novel_id;

  insert into public.episodes (
    novel_id, title, episode_number, body, is_free, status, view_count
  ) values (
    p_novel_id, p_title, v_episode_number, p_body, p_is_free, 'published', 0
  ) returning id into v_episode_id;

  update public.novels
  set
    total_episode_count = (
      select count(*) from public.episodes
      where novel_id = p_novel_id and status = 'published'
    ),
    free_episode_count = (
      select count(*) from public.episodes
      where novel_id = p_novel_id and status = 'published' and is_free = true
    )
  where id = p_novel_id;

  return jsonb_build_object(
    'episode_id', v_episode_id,
    'episode_number', v_episode_number
  );
end;
$$;

-- Add user coins (for payment processing)
create or replace function public.add_user_coins(
  p_user_id uuid,
  p_amount int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance int;
begin
  insert into public.user_coins (user_id, balance)
  values (p_user_id, p_amount)
  on conflict (user_id) do update
  set balance = user_coins.balance + p_amount,
      updated_at = now()
  returning balance into v_balance;

  return jsonb_build_object(
    'user_id', p_user_id,
    'added', p_amount,
    'new_balance', v_balance
  );
end;
$$;

grant execute on function public.create_novel_with_episode to authenticated;
grant execute on function public.create_episode_for_author_novel to authenticated;
grant execute on function public.add_user_coins to authenticated;

-- Create coin_purchases table if not exists
create table if not exists public.coin_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tier int not null,
  amount int not null,
  status text not null default 'pending',
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- Create user_coins table if not exists
create table if not exists public.user_coins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  balance int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.coin_purchases enable row level security;
alter table public.user_coins enable row level security;

create policy "Users can view own purchases"
  on public.coin_purchases for select
  using (auth.uid() = user_id);

create policy "Users can insert own purchases"
  on public.coin_purchases for insert
  with check (auth.uid() = user_id);

create policy "Users can update own purchases"
  on public.coin_purchases for update
  using (auth.uid() = user_id);

create policy "Users can view own coins"
  on public.user_coins for select
  using (auth.uid() = user_id);

create policy "Users can insert own coins"
  on public.user_coins for insert
  with check (auth.uid() = user_id);

create policy "Users can update own coins"
  on public.user_coins for update
  using (auth.uid() = user_id);
