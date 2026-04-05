-- Sync creator runtime functions and fields to remote Supabase

alter type public.publish_status add value if not exists 'trashed';

alter table if exists public.novels
  add column if not exists archived_from_status public.novel_status;

create unique index if not exists authors_user_id_uidx on public.authors(user_id)
  where user_id is not null;

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
  invalid_tag_count integer := 0;
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
    select count(*)
    into invalid_tag_count
    from (
      select distinct nullif(trim(input_tag.tag_name), '') as tag_name
      from unnest(p_tags) as input_tag(tag_name)
    ) normalized_tags
    left join public.tags t on lower(t.name) = lower(normalized_tags.tag_name)
    where normalized_tags.tag_name is not null
      and t.id is null;

    if invalid_tag_count > 0 then
      raise exception '태그 정보를 다시 확인해 주세요.';
    end if;

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

