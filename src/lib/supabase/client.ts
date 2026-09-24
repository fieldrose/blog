import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { hasSupabasePublicEnv, supabasePublicEnv } from "@/lib/env";

let browserClient: SupabaseClient | null = null;

/**
 * Browser Supabase client (PKCE flow, persisted session).
 * Safe to call from client components; throws only when actually used
 * without the required PUBLIC env vars.
 */
export function getBrowserSupabase(): SupabaseClient {
  if (browserClient) return browserClient;

  if (!hasSupabasePublicEnv) {
    throw new Error(
      "Supabase is not configured: set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY in .env.local."
    );
  }

  browserClient = createClient(
    supabasePublicEnv.url,
    supabasePublicEnv.anonKey,
    {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );

  return browserClient;
}
