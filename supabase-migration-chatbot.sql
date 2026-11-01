-- AI Chat Bot (Admin → AI Chat Bot): Facebook Messenger conversations.
--
-- One row per customer who has messaged your Page (psid = their Page-scoped id), and
-- one row per message in either direction. `sender` says who wrote an outgoing message:
-- the AI or you replying by hand from the inbox. Token counts and cost are stored on
-- AI replies so the inbox can show what the bot is costing you.
--
-- Training data (products, suggested replies, store info) and the Page / AI connection
-- live in the `settings` table (key "chatbot"), like every other admin setting.
--
-- Safe to run more than once.

create table if not exists chat_conversations (
  id               uuid primary key default gen_random_uuid(),
  psid             text unique not null,          -- Messenger page-scoped user id
  name             text,                          -- customer's name from Facebook (if allowed)
  avatar           text,
  ai_enabled       boolean not null default true, -- AI auto-replies in THIS chat
  unread           int not null default 0,
  last_message     text,
  last_message_at  timestamptz default now(),
  last_customer_at timestamptz,                   -- Messenger only allows replies within 24h of this
  created_at       timestamptz default now()
);
create index if not exists chat_conversations_last_idx on chat_conversations (last_message_at desc);

create table if not exists chat_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references chat_conversations(id) on delete cascade,
  direction       text not null check (direction in ('in', 'out')),
  sender          text not null check (sender in ('customer', 'ai', 'admin')),
  text            text not null,
  mid             text,                           -- Facebook message id (dedupe retries)
  input_tokens    int,
  output_tokens   int,
  cost_usd        numeric(12, 8),
  created_at      timestamptz default now()
);
create index if not exists chat_messages_conv_idx on chat_messages (conversation_id, created_at);
create unique index if not exists chat_messages_mid_idx on chat_messages (mid) where mid is not null;

-- Server-only tables: the storefront never reads them with the public key.
alter table chat_conversations enable row level security;
alter table chat_messages enable row level security;
