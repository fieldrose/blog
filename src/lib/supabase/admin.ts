// SERVER ONLY — do not import from client components.
// Enforced by the no-restricted-imports ESLint rule (eslint.config.js).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_ROLE_KEY } from "astro:env/server";
import { hasSupabasePublicEnv, supabasePublicEnv } from "@/lib/env";

let adminClient: SupabaseClient | null = null;

/** Whether service-role access is available in the current runtime. */
export function hasAdminSupabase(): boolean {
  return Boolean(hasSupabasePublicEnv && SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * SERVER-ONLY Supabase client using the service_role key (bypasses RLS).
 * The `server-only` import makes any accidental client-side import a build error.
 */
export function getAdminSupabase(): SupabaseClient {
  if (adminClient) return adminClient;

  if (!supabasePublicEnv.url || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase admin access is not configured: set PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  adminClient = createClient(supabasePublicEnv.url, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  return adminClient;
}
