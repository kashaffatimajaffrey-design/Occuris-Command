-- 0001_tenants_profiles.sql
--
-- The auth half of the schema: the two tables the application actually
-- queries. AuthContext reads profiles.tenant_id and embeds tenants(name);
-- auth.py resolves a bearer token to a tenant through profiles;
-- onboarding_routes.py writes both.
--
-- Deliberately does NOT include an event/order model. That shape depends on
-- the thread-context decision and is designed in C3.
--
-- Superseded: supabase/schema.sql. Do not run it. It models organizations /
-- organization_members, which no code queries, and enables RLS on eight
-- tables without defining a single policy.

create table if not exists tenants (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  region     text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  tenant_id  uuid not null references tenants(id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

create index if not exists profiles_tenant_id_idx on profiles(tenant_id);

alter table tenants  enable row level security;
alter table profiles enable row level security;

-- Without these, RLS denies everything to the anon/authenticated roles and
-- every frontend query returns empty with no error. Enabling RLS and defining
-- no policy is the failure mode this file exists to avoid.

drop policy if exists profiles_self_read on profiles;
create policy profiles_self_read on profiles
  for select
  using (auth.uid() = id);

drop policy if exists tenants_member_read on tenants;
create policy tenants_member_read on tenants
  for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.tenant_id = tenants.id
    )
  );

-- Onboarding inserts through the backend's service-role key, which bypasses
-- RLS, so no insert policies are needed for that path.

-- Privileges for the API roles.
--
-- Creating a table does not grant anything to Supabase's roles. Without these,
-- PostgREST returns 42501 "permission denied for table ..." to every caller,
-- including service_role, and login fails before RLS is ever consulted.
-- RLS still applies to anon and authenticated: a grant lets the role reach the
-- table, the policies above decide which rows it sees. service_role bypasses
-- RLS and is what the backend uses for onboarding writes.

grant usage on schema public to anon, authenticated, service_role;

grant all    on public.tenants  to service_role;
grant all    on public.profiles to service_role;

grant select on public.tenants  to anon, authenticated;
grant select on public.profiles to anon, authenticated;
