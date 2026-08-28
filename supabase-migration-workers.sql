-- ============================================================================
-- DreamComfort — Workers / production & salary module
-- Run this ONCE in Supabase → SQL Editor.
-- ============================================================================

-- Piece types. A "set" = 1 of each in_set piece; set cost = sum of their pcs_cost.
create table if not exists worker_items (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  pcs_cost numeric not null default 0,
  in_set boolean not null default true,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists workers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  photo text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- What a worker produced (sets or individual pieces).
create table if not exists worker_production (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references workers(id) on delete cascade,
  entry_date date not null default (now() at time zone 'utc')::date,
  kind text not null,                -- 'set' | 'piece'
  item_id uuid references worker_items(id) on delete set null,
  item_name text,                    -- snapshot label
  quantity int not null default 1,
  unit_cost numeric not null default 0,  -- per set (sum of pieces) OR per piece
  amount numeric not null default 0,     -- quantity * unit_cost
  note text,
  created_at timestamptz not null default now()
);

-- Damage cuts, bonuses, and payments (পরিশোধ) against a worker's balance.
create table if not exists worker_adjustments (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references workers(id) on delete cascade,
  entry_date date not null default (now() at time zone 'utc')::date,
  kind text not null,                -- 'damage' | 'bonus' | 'payment'
  amount numeric not null default 0,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_wp_worker on worker_production(worker_id);
create index if not exists idx_wa_worker on worker_adjustments(worker_id);

-- Seed the 5 standard pieces (edit their costs later in the admin panel).
insert into worker_items (name, pcs_cost, sort_order) values
  ('বড় ম্যাটারনিটি পিলো', 0, 1),
  ('মুন শেপ পিলো', 0, 2),
  ('ডি শেপ পিলো', 0, 3),
  ('নেক পিলো', 0, 4),
  ('আই মাস্ক', 0, 5)
on conflict (name) do nothing;
