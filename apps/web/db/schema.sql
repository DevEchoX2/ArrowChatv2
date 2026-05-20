-- ArrowChatv2 schema (PostgreSQL / Supabase)
-- Run in Supabase SQL Editor or psql as a privileged role.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- Profiles
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null,
  avatar_url text,
  bio text,
  tier text not null default 'free' check (tier in ('free', 'premium', 'staff')),
  badges jsonb not null default '[]'::jsonb,
  social_links jsonb not null default '[]'::jsonb,
  profile_theme jsonb not null default jsonb_build_object(
    'backgroundType', 'solid',
    'backgroundColor', '#000000',
    'accentColor', '#ffffff'
  ),
  is_online boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_username_idx on public.profiles (username);

-- ─────────────────────────────────────────────────────────────────────────────
-- Messages (global + direct)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid references public.profiles(id) on delete cascade,
  thread_type text not null check (thread_type in ('global', 'dm')),
  content text not null check (char_length(trim(content)) > 0 and char_length(content) <= 4000),
  tts boolean not null default false,
  created_at timestamptz not null default now(),
  constraint global_message_recipient_null
    check ((thread_type = 'global' and recipient_id is null) or (thread_type = 'dm' and recipient_id is not null))
);

create index if not exists messages_global_created_idx
  on public.messages (thread_type, created_at)
  where thread_type = 'global';

create index if not exists messages_dm_pair_created_idx
  on public.messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at)
  where thread_type = 'dm';

-- ─────────────────────────────────────────────────────────────────────────────
-- updated_at trigger
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_touch_updated_at on public.profiles;
create trigger trg_profiles_touch_updated_at
before update on public.profiles
for each row
execute function public.touch_updated_at();

-- Auto-create profile on auth signup.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
begin
  base_username := lower(split_part(coalesce(new.email, ''), '@', 1));
  if base_username = '' then
    base_username := 'user_' || substr(new.id::text, 1, 8);
  end if;
  base_username := regexp_replace(base_username, '[^a-z0-9_]', '_', 'g');
  base_username := substr(base_username, 1, 24);

  insert into public.profiles (
    id, username, display_name, tier, badges, social_links, profile_theme, is_online
  ) values (
    new.id,
    base_username,
    base_username,
    'free',
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_object('backgroundType', 'solid', 'backgroundColor', '#000000', 'accentColor', '#ffffff'),
    true
  ) on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- Row-level security
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.messages enable row level security;

-- Public profile reads; owner-only writes.
drop policy if exists profiles_public_read on public.profiles;
create policy profiles_public_read
on public.profiles
for select
using (true);

drop policy if exists profiles_owner_insert on public.profiles;
create policy profiles_owner_insert
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists profiles_owner_update on public.profiles;
create policy profiles_owner_update
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Messages visibility: global for everyone, DMs only participants.
drop policy if exists messages_select_policy on public.messages;
create policy messages_select_policy
on public.messages
for select
using (
  thread_type = 'global'
  or auth.uid() = sender_id
  or auth.uid() = recipient_id
);

-- Insert rules: sender must be current user; global has null recipient, dm has non-null recipient.
drop policy if exists messages_insert_policy on public.messages;
create policy messages_insert_policy
on public.messages
for insert
with check (
  auth.uid() = sender_id
  and (
    (thread_type = 'global' and recipient_id is null)
    or (thread_type = 'dm' and recipient_id is not null)
  )
);

-- Optional: disable edits/deletes to preserve history.
drop policy if exists messages_update_none on public.messages;
create policy messages_update_none
on public.messages
for update
using (false)
with check (false);

drop policy if exists messages_delete_none on public.messages;
create policy messages_delete_none
on public.messages
for delete
using (false);

-- ─────────────────────────────────────────────────────────────────────────────
-- Realtime configuration
-- ─────────────────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.messages;
