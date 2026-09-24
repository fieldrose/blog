// SERVER ONLY — request authentication helpers for BFF routes.
import { createHash } from "node:crypto";
import { SUPABASE_SERVICE_ROLE_KEY } from "astro:env/server";
import { supabasePublicEnv } from "@/lib/env";
import { getUserSupabase } from "@/lib/supabase/asUser";

export type AuthResult =
  | { kind: "user"; token: string; userId: string }
  | { kind: "anon" }
  /** A Bearer token was sent but Supabase rejected it. */
  | { kind: "invalid" };

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

/**
 * Resolves the caller identity.
 * - valid JWT  → user identity
 * - no token   → anon
 * - bad token  → invalid (write routes SHOULD answer 401, not silently downgrade)
 */
export async function authenticate(request: Request): Promise<AuthResult> {
  const token = getBearerToken(request);
  if (!token) return { kind: "anon" };

  try {
    const supabase = getUserSupabase(token);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return { kind: "invalid" };
    return { kind: "user", token, userId: data.user.id };
  } catch {
    return { kind: "invalid" };
  }
}

/**
 * Non-reversible daily key for rate limiting. The raw IP is never stored;
 * the key rotates each day and is salted with a server-only secret.
 */
export function dailyRateLimitKey(
  ip: string | undefined,
  scope: string
): string {
  const day = new Date().toISOString().slice(0, 10);
  const salt =
    SUPABASE_SERVICE_ROLE_KEY ||
    supabasePublicEnv.anonKey ||
    "rate-limit-fallback-salt";
  const hash = createHash("sha256")
    .update(`${salt}|${day}|${scope}|${ip ?? "unknown"}`)
    .digest("hex");
  return `${scope}:${hash}`;
}
