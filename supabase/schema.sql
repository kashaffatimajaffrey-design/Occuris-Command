create extension if not exists vector;

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists organization_members (
  organization_id uuid references organizations(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('owner', 'admin', 'procurement', 'inventory', 'risk', 'compliance', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists boms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists bom_items (
  id uuid primary key default gen_random_uuid(),
  bom_id uuid references boms(id) on delete cascade,
  mpn text not null,
  quantity integer not null,
  supplier text,
  lifecycle_state text,
  risk_score integer default 0,
  created_at timestamptz not null default now()
);

create table if not exists knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  source_type text not null,
  title text not null,
  raw_text text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references knowledge_sources(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  chunk_index integer not null,
  text text not null,
  embedding vector(1536),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists operational_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  event_type text not null,
  entity_ref text,
  severity text not null check (severity in ('stable', 'watch', 'critical')),
  summary text not null,
  source_id uuid references knowledge_sources(id) on delete set null,
  event_time timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  severity text not null,
  title text not null,
  body text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create index if not exists knowledge_chunks_embedding_idx
on knowledge_chunks using ivfflat (embedding vector_cosine_ops);

alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table boms enable row level security;
alter table bom_items enable row level security;
alter table knowledge_sources enable row level security;
alter table knowledge_chunks enable row level security;
alter table operational_events enable row level security;
alter table alerts enable row level security;

