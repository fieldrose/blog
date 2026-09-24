// SERVER ONLY — do not import from client components.
// Enforced by the no-restricted-imports ESLint rule (eslint.config.js).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabasePublicEnv } from "@/lib/env";

/**
 * SERVER-ONLY client that forwards the end user's JWT to PostgREST,
 * so RLS policies evaluate as the logged-in user (not the service role).
 *
 * Use inside BFF endpoints after verifying the bearer token.
 */
export function getUserSupabase(accessToken: string): SupabaseClient {
  if (!supabasePublicEnv.url || !supabasePublicEnv.anonKey) {
    throw new Error("Supabase public env vars are not configured.");
  }

  return createClient(supabasePublicEnv.url, supabasePublicEnv.anonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: { persistSession: false },
  });
}
