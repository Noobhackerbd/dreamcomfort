// lib/supabase/client.ts
// Browser Supabase client (anon key). Safe for client components — only reads
// what RLS allows (active products / categories).

import { createClient } from "@supabase/supabase-js";

export function getBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anonKey);
}
