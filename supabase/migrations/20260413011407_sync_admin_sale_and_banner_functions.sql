create or replace function public.list_novels_for_admin()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  is_admin boolean := false;
  payload jsonb := '[]'::jsonb;
begin
  if current_user_id is null then
    raise exception '로그인이 필요합니다.';
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

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', n.id,
        'slug', n.slug,
        'title', n.title,
        'subtitle', n.subtitle,
        'short_description', n.short_description,
        'status', n.status,
        'cover_url', n.cover_url,
        'banner_url', n.banner_url,
        'total_episode_count', n.total_episode_count,
        'free_episode_count', n.free_episode_count,
        'reaction_score', n.reaction_score,
        'view_count', n.view_count,
        'bundle_list_price', n.bundle_list_price,
        'bundle_sale_price', n.bundle_sale_price,
        'sale_starts_at', n.sale_starts_at,
        'sale_ends_at', n.sale_ends_at,
        'updated_at', n.updated_at,
        'is_translation', n.is_translation,
        'author_name', a.pen_name,
        'tags', coalesce((
          select jsonb_agg(t.name order by t.name)
          from public.novel_tags nt
          join public.tags t on t.id = nt.tag_id
          where nt.novel_id = n.id
        ), '[]'::jsonb)
      )
      order by n.updated_at desc, n.title asc
    ),
    '[]'::jsonb
  )
  into payload
  from public.novels n
  join public.authors a on a.id = n.author_id;

  return payload;
end;
$$;

create or replace function public.upsert_novel_sale_for_admin(
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
  is_admin boolean := false;
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

  if p_sale_starts_at is null or p_sale_ends_at is null or p_sale_ends_at <= p_sale_starts_at then
    raise exception '할인 기간을 다시 확인해 주세요.';
  end if;

  if p_discount_percent is null or p_discount_percent <= 0 or p_discount_percent >= 100 then
    raise exception '할인율을 다시 확인해 주세요.';
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
    '관리자가 등록한 단일 작품 할인 이벤트',
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

create or replace function public.clear_novel_sale_for_admin(
  p_novel_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  is_admin boolean := false;
  now_utc timestamptz := timezone('utc', now());
  event_slug text;
  target_event_id uuid;
begin
  if current_user_id is null then
    raise exception '로그인이 필요합니다.';
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
    from public.novels
    where id = p_novel_id
  ) then
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

create or replace function public.get_home_hero_banner_for_admin()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  is_admin boolean := false;
  payload jsonb;
begin
  if current_user_id is null then
    raise exception '로그인이 필요합니다.';
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

  select jsonb_build_object(
    'event_id', e.id,
    'novel_id', ei.novel_id,
    'title', e.title,
    'subtitle', e.subtitle,
    'description', e.description,
    'hero_image_url', e.hero_image_url,
    'status', e.status,
    'starts_at', e.starts_at,
    'ends_at', e.ends_at
  )
  into payload
  from public.events e
  left join lateral (
    select novel_id
    from public.event_items
    where event_id = e.id
    order by sort_order asc, created_at asc
    limit 1
  ) ei on true
  where e.slug = 'home-hero-banner'
    and e.event_type = 'featured_drop'
  limit 1;

  return payload;
end;
$$;

create or replace function public.upsert_home_hero_banner_for_admin(
  p_novel_id uuid,
  p_title text,
  p_subtitle text,
  p_description text,
  p_hero_image_url text,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  is_admin boolean := false;
  novel_row public.novels%rowtype;
  now_utc timestamptz := timezone('utc', now());
  next_status public.event_status;
  target_event_id uuid;
  title_value text;
  subtitle_value text;
  description_value text;
  hero_image_value text;
begin
  if current_user_id is null then
    raise exception '로그인이 필요합니다.';
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

  if p_novel_id is null then
    raise exception '대표로 노출할 작품을 선택해 주세요.';
  end if;

  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then
    raise exception '배너 노출 기간을 다시 확인해 주세요.';
  end if;

  select *
  into novel_row
  from public.novels
  where id = p_novel_id;

  if not found then
    raise exception '작품 정보를 찾을 수 없습니다.';
  end if;

  next_status := case
    when now_utc < p_starts_at then 'scheduled'::public.event_status
    when now_utc >= p_ends_at then 'ended'::public.event_status
    else 'active'::public.event_status
  end;

  title_value := coalesce(nullif(trim(p_title), ''), novel_row.title);
  subtitle_value := coalesce(nullif(trim(p_subtitle), ''), novel_row.subtitle, novel_row.title);
  description_value := coalesce(nullif(trim(p_description), ''), novel_row.short_description, novel_row.description, '');
  hero_image_value := coalesce(nullif(trim(p_hero_image_url), ''), novel_row.banner_url, novel_row.cover_url, '');

  insert into public.events (
    slug,
    title,
    subtitle,
    description,
    hero_image_url,
    event_type,
    status,
    starts_at,
    ends_at
  )
  values (
    'home-hero-banner',
    title_value,
    subtitle_value,
    description_value,
    hero_image_value,
    'featured_drop',
    next_status,
    p_starts_at,
    p_ends_at
  )
  on conflict (slug) do update
  set
    title = excluded.title,
    subtitle = excluded.subtitle,
    description = excluded.description,
    hero_image_url = excluded.hero_image_url,
    event_type = 'featured_drop',
    status = excluded.status,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    updated_at = timezone('utc', now())
  returning id into target_event_id;

  delete from public.event_items
  where event_id = target_event_id;

  insert into public.event_items (
    event_id,
    novel_id,
    sort_order
  )
  values (
    target_event_id,
    p_novel_id,
    1
  )
  on conflict (event_id, novel_id) do update
  set
    sort_order = excluded.sort_order;

  return jsonb_build_object(
    'ok', true,
    'event_id', target_event_id,
    'novel_id', p_novel_id,
    'status', next_status,
    'title', title_value,
    'hero_image_url', hero_image_value,
    'starts_at', p_starts_at,
    'ends_at', p_ends_at
  );
end;
$$;

create or replace function public.clear_home_hero_banner_for_admin()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  is_admin boolean := false;
  now_utc timestamptz := timezone('utc', now());
  target_event_id uuid;
begin
  if current_user_id is null then
    raise exception '로그인이 필요합니다.';
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

  update public.events
  set
    status = 'ended'::public.event_status,
    ends_at = now_utc,
    updated_at = now_utc
  where slug = 'home-hero-banner'
    and event_type = 'featured_drop'
  returning id into target_event_id;

  if target_event_id is not null then
    delete from public.event_items
    where event_id = target_event_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'event_id', target_event_id,
    'cleared_at', now_utc
  );
end;
$$;
