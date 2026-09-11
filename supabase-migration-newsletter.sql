-- Newsletter / community email signups (homepage + footer). Inserted via a server action.

create table if not exists newsletter_subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  source     text,                       -- where they signed up (home / footer)
  created_at timestamptz default now()
);

alter table newsletter_subscribers enable row level security;
-- No public policies: only the service-role server action reads/writes this table.
