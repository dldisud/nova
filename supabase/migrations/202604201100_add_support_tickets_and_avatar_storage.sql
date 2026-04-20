create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  category text not null check (category in ('account', 'payment', 'content', 'bug', 'other')),
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.support_tickets enable row level security;

drop policy if exists "Users can insert own support tickets" on public.support_tickets;
create policy "Users can insert own support tickets"
  on public.support_tickets
  for insert
  to authenticated
  with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "Users can view own support tickets" on public.support_tickets;
create policy "Users can view own support tickets"
  on public.support_tickets
  for select
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', true)
on conflict (id) do nothing;

drop policy if exists "Users can upload own profile avatars" on storage.objects;
create policy "Users can upload own profile avatars"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and auth.uid() is not null
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "Users can update own profile avatars" on storage.objects;
create policy "Users can update own profile avatars"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and auth.uid() is not null
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "Users can view profile avatars" on storage.objects;
create policy "Users can view profile avatars"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'profile-avatars');
