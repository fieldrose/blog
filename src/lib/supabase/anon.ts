// SERVER ONLY — stateless anonymous Supabase client for public reads
// (aggregation views / published data). RLS applies exactly as for browsers.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { hasSupabasePublicEnv, supabasePublicEnv } from "@/lib/env";

let anonClient: SupabaseClient | null = null;

export function hasSupabase(): boolean {
  return hasSupabasePublicEnv;
}

export function getAnonSupabase(): SupabaseClient {
  if (anonClient) return anonClient;

  if (!hasSupabasePublicEnv) {
    throw new Error(
      "Supabase is not configured: set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  anonClient = createClient(supabasePublicEnv.url, supabasePublicEnv.anonKey, {
    auth: { persistSession: false },
  });

  return anonClient;
}
