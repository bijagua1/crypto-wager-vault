-- Create enums
create type public.app_role as enum ('admin', 'user');
create type public.bet_type as enum ('single', 'parlay');
create type public.bet_status as enum ('pending', 'approved', 'rejected', 'settled', 'void');
create type public.transaction_type as enum ('deposit', 'withdrawal', 'bet_place', 'bet_settle', 'adjustment');

-- Utility function to update updated_at
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  balance_usd numeric(12,2) not null default 0,
  balance_btc numeric(20,8) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create index if not exists idx_profiles_email on public.profiles (lower(email));

create or replace trigger update_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

-- Trigger to create profiles row on new auth user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Ensure trigger exists
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Roles table
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Role helper function
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

-- Bets core tables
create table if not exists public.bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.bet_type not null,
  status public.bet_status not null default 'pending',
  stake_usd numeric(12,2) not null default 0,
  stake_btc numeric(20,8) not null default 0,
  potential_payout_usd numeric(14,2) not null default 0,
  potential_payout_btc numeric(20,8) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bets_user_id on public.bets(user_id);

alter table public.bets enable row level security;

create or replace trigger update_bets_updated_at
before update on public.bets
for each row execute function public.update_updated_at_column();

create table if not exists public.bet_selections (
  id uuid primary key default gen_random_uuid(),
  bet_id uuid not null references public.bets(id) on delete cascade,
  game_id text not null,
  league text,
  market text,
  selection text not null,
  odds numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_bet_selections_bet_id on public.bet_selections(bet_id);

alter table public.bet_selections enable row level security;

-- Transactions log
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.transaction_type not null,
  amount_usd numeric(12,2) default 0,
  amount_btc numeric(20,8) default 0,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_user_id on public.transactions(user_id);

alter table public.transactions enable row level security;

-- RLS Policies
-- profiles
create policy "Users can view own profile" on public.profiles
for select to authenticated
using (id = auth.uid());

create policy "Admins can view all profiles" on public.profiles
for select to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update any profile" on public.profiles
for update to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- user_roles
create policy "Admins manage roles" on public.user_roles
for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create policy "Users can read own roles" on public.user_roles
for select to authenticated
using (user_id = auth.uid());

-- bets
create policy "Users view own bets" on public.bets
for select to authenticated
using (user_id = auth.uid());

create policy "Admins view all bets" on public.bets
for select to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "Users create bets" on public.bets
for insert to authenticated
with check (user_id = auth.uid());

create policy "Admins update bets" on public.bets
for update to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins delete bets" on public.bets
for delete to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- bet_selections
create policy "Users view own bet selections" on public.bet_selections
for select to authenticated
using (exists (select 1 from public.bets b where b.id = bet_id and (b.user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))));

create policy "Users add bet selections for own bets" on public.bet_selections
for insert to authenticated
with check (exists (select 1 from public.bets b where b.id = bet_id and b.user_id = auth.uid()));

create policy "Admins update/delete bet selections" on public.bet_selections
for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- transactions
create policy "Users view own transactions" on public.transactions
for select to authenticated
using (user_id = auth.uid());

create policy "Admins manage transactions" on public.transactions
for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));
