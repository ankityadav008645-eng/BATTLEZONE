-- BattleZone Supabase starter schema
-- Run in Supabase SQL Editor. Review before production use.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'player' check (role in ('player','owner')),
  created_at timestamptz not null default now()
);

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 80),
  mode text not null check (mode in ('Solo','Duo','Squad')),
  map_name text not null default 'TBA',
  starts_at timestamptz,
  max_slots integer not null default 48 check (max_slots between 2 and 1000),
  entry_fee numeric(10,2) not null default 0 check (entry_fee >= 0),
  prize_pool numeric(10,2) not null default 0 check (prize_pool >= 0),
  status text not null default 'open' check (status in ('open','closed','completed')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player_id uuid not null references auth.users(id) on delete cascade,
  team_name text not null check (char_length(team_name) between 1 and 60),
  game_uid text not null check (char_length(game_uid) between 1 and 30),
  team_size text not null check (team_size in ('Solo','Duo','Squad')),
  status text not null default 'registered' check (status in ('registered','cancelled','disqualified')),
  result text not null default 'pending' check (result in ('pending','winner','runner_up')),
  created_at timestamptz not null default now(),
  unique(tournament_id, player_id)
);

-- New auth users get a player profile. Never accept role from signup metadata.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name','Player'), 'player')
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner');
$$;

alter table public.profiles enable row level security;
alter table public.tournaments enable row level security;
alter table public.registrations enable row level security;

-- Players can read their own profile; owner can read all. Users cannot promote themselves.
drop policy if exists "profile read self or owner" on public.profiles;
create policy "profile read self or owner" on public.profiles for select to authenticated
using (id = auth.uid() or public.is_owner());
drop policy if exists "profile update self display name" on public.profiles;
create policy "profile update self display name" on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));

-- Anyone may view published tournaments. Only server-authorized owner role can mutate.
drop policy if exists "tournaments public read" on public.tournaments;
create policy "tournaments public read" on public.tournaments for select to anon, authenticated using (true);
drop policy if exists "owner create tournaments" on public.tournaments;
create policy "owner create tournaments" on public.tournaments for insert to authenticated with check (public.is_owner() and created_by = auth.uid());
drop policy if exists "owner update tournaments" on public.tournaments;
create policy "owner update tournaments" on public.tournaments for update to authenticated using (public.is_owner()) with check (public.is_owner());
drop policy if exists "owner delete tournaments" on public.tournaments;
create policy "owner delete tournaments" on public.tournaments for delete to authenticated using (public.is_owner());

-- Players can register only as themselves; owner can view/manage registrations.
drop policy if exists "player read own registrations or owner" on public.registrations;
create policy "player read own registrations or owner" on public.registrations for select to authenticated
using (player_id = auth.uid() or public.is_owner());
drop policy if exists "player create own registration" on public.registrations;
create policy "player create own registration" on public.registrations for insert to authenticated
with check (player_id = auth.uid() and exists(select 1 from public.tournaments t where t.id = tournament_id and t.status = 'open'));
drop policy if exists "player cancel own or owner manage" on public.registrations;
create policy "player cancel own or owner manage" on public.registrations for update to authenticated
using (player_id = auth.uid() or public.is_owner())
with check (player_id = auth.uid() or public.is_owner());
drop policy if exists "owner delete registrations" on public.registrations;
create policy "owner delete registrations" on public.registrations for delete to authenticated using (public.is_owner());

-- IMPORTANT: This client starter intentionally has no money-transfer or payout table.
-- Integrate a licensed provider using a server-side function and verified payment webhooks.
-- Never expose service_role keys in client code.
