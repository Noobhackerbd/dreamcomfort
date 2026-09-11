-- Customer support tickets + threaded messages. A ticket can be raised by a logged-in
-- customer (user_id set) or a guest (user_id null, matched later by phone/email).

create table if not exists support_tickets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,
  name         text,
  phone        text,
  email        text,
  subject      text,
  category     text default 'general',   -- general / order / return / payment
  order_number text,
  status       text default 'open',      -- open / answered / closed
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create table if not exists support_messages (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references support_tickets(id) on delete cascade,
  sender     text not null default 'customer',  -- 'customer' | 'admin'
  body       text not null,
  created_at timestamptz default now()
);

create index if not exists idx_support_tickets_user on support_tickets(user_id);
create index if not exists idx_support_tickets_status on support_tickets(status);
create index if not exists idx_support_messages_ticket on support_messages(ticket_id);

-- RLS: customers reach these only through server actions (service role, session-checked);
-- these policies additionally let a signed-in customer read their own tickets/messages.
alter table support_tickets enable row level security;
alter table support_messages enable row level security;

drop policy if exists "own tickets read" on support_tickets;
create policy "own tickets read" on support_tickets for select using (auth.uid() = user_id);

drop policy if exists "own messages read" on support_messages;
create policy "own messages read" on support_messages for select using (
  exists (select 1 from support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
);
