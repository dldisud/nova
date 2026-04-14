create or replace function public.bootstrap_admin_access()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if current_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if current_email <> 'rimuru2178@gmail.com' then
    raise exception '이 계정은 관리자 승격 대상이 아닙니다.';
  end if;

  update public.profiles
  set
    role = 'admin'::public.user_role,
    updated_at = timezone('utc', now())
  where id = current_user_id;

  return jsonb_build_object(
    'ok', true,
    'user_id', current_user_id,
    'role', 'admin',
    'email', current_email
  );
end;
$$;
