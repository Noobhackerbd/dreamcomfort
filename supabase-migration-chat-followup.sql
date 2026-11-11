-- supabase-migration-chat-followup.sql — AI Chat Bot follow-ups + remembered আপু / ভাইয়া.
-- Safe to run more than once.
--
--   followup_step   how many follow-ups were sent since the customer's last message
--                   (back to 0 whenever the customer writes)
--   followup_at     when the last follow-up went out
--   gender          F / M / U — the AI's guess from the name, so follow-ups say আপু / ভাইয়া right

ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS followup_step int NOT NULL DEFAULT 0;
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS followup_at timestamptz;
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS gender text;

CREATE INDEX IF NOT EXISTS chat_conversations_last_customer_idx ON chat_conversations (last_customer_at);
