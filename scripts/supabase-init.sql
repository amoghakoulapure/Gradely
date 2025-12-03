-- Supabase initialization SQL
-- Creates a public.users table that mirrors auth.users entries and a trigger to populate it

-- Create users table in public schema
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Function to copy new auth.users rows into public.users
create or replace function public.handle_auth_user_created()
returns trigger language plpgsql as $$
begin
  insert into public.users (id, email, created_at, updated_at)
  values (new.id, new.email, coalesce(new.created_at, now()), coalesce(new.created_at, now()))
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$;

-- Trigger on auth.users insert
drop trigger if exists supabase_public_users_on_auth_user_created on auth.users;
create trigger supabase_public_users_on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_auth_user_created();

-- Ensure updated_at in public.users is maintained on update
create or replace function public.sync_public_users_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists supabase_public_users_updated_at on public.users;
create trigger supabase_public_users_updated_at
before update on public.users
for each row execute procedure public.sync_public_users_updated_at();

-- End of file
