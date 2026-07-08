-- 016_handle_new_user.sql
-- Auto-provision a profile + default membership whenever a new auth user is
-- created. Needed because the landing page now signs members in via Google
-- OAuth (no client-side form to insert user_profiles / memberships anymore).
-- This also fixes the "can't save Edit Profile" bug at its root: every user is
-- now guaranteed a user_profiles row, so the dashboard update always targets an
-- existing row.

-- ---------------------------------------------------------------------------
-- Trigger function: runs inside the auth signup transaction.
-- SECURITY DEFINER + a pinned search_path so it can insert past RLS.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Profile row (PK = auth.users.id). Seed name/avatar from the OAuth metadata
  -- Google returns; the rest is filled later in Edit Profile.
  insert into public.user_profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;

  -- Default free 'nyantai' membership (tier is NOT NULL, must be supplied).
  if not exists (select 1 from public.memberships where user_id = new.id) then
    insert into public.memberships (user_id, tier, status)
    values (new.id, 'nyantai', 'active');
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Trigger on auth.users
-- ---------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Backfill: give every existing auth user a profile + membership if missing.
-- Fixes members who registered before this trigger (the source of the
-- Edit-Profile save bug).
-- ---------------------------------------------------------------------------
insert into public.user_profiles (id, full_name, avatar_url)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
  coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture')
from auth.users u
left join public.user_profiles p on p.id = u.id
where p.id is null;

insert into public.memberships (user_id, tier, status)
select u.id, 'nyantai', 'active'
from auth.users u
where not exists (
  select 1 from public.memberships m where m.user_id = u.id
);
