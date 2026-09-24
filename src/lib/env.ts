/**
 * Typed, safe access to PUBLIC client-side environment variables.
 *
 * All Supabase vars are declared `optional` in astro.config.ts so that CI and
 * local builds work without secrets. Feature code MUST therefore check the
 * `has*` flags instead of assuming values exist.
 */
import {
  PUBLIC_SITE_URL,
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY,
} from "astro:env/client";

export const siteUrl = PUBLIC_SITE_URL ?? "http://localhost:4321/";

export const supabasePublicEnv = {
  url: PUBLIC_SUPABASE_URL ?? "",
  anonKey: PUBLIC_SUPABASE_ANON_KEY ?? "",
};

/** Whether browser/admin Supabase clients can be constructed. */
export const hasSupabasePublicEnv = Boolean(
  supabasePublicEnv.url && supabasePublicEnv.anonKey
);
