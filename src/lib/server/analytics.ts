// SERVER ONLY — privacy helpers for the analytics collect endpoint.
import { createHash } from "node:crypto";
import { SUPABASE_SERVICE_ROLE_KEY } from "astro:env/server";
import { siteUrl } from "@/lib/env";

/**
 * Daily-rotating, non-reversible visitor id.
 * The raw IP is never stored; the salt (server secret + UTC date) makes the
 * hash unlinkable across days.
 */
export function dailyVisitorHash(
  ip: string | undefined,
  clientId: string
): string {
  const day = new Date().toISOString().slice(0, 10);
  // The collect endpoint 503s without the service-role key, so this fallback
  // salt only ever applies in tests.
  const salt = SUPABASE_SERVICE_ROLE_KEY || "analytics-fallback-salt";
  return createHash("sha256")
    .update(`${salt}|${day}|${ip ?? "unknown"}|${clientId}`)
    .digest("hex");
}

/** A pathname we accept for analytics: absolute, same-site, bounded length. */
export function isInternalPath(path: unknown): path is string {
  return (
    typeof path === "string" &&
    path.startsWith("/") &&
    !path.startsWith("//") &&
    path.length <= 200 &&
    // printable ASCII path characters only (no spaces/control chars)
    /^[/\w\-.,~!$&'()*+;=:@%]+$/u.test(path)
  );
}

/**
 * Reduce a referrer to "host/path" with no query/hash; return null for
 * same-site or unparseable referrers (direct/internal traffic).
 */
export function normalizeReferrer(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 500) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(url.protocol)) return null;

  const siteHost = (() => {
    try {
      return new URL(siteUrl).host;
    } catch {
      return null;
    }
  })();

  if (siteHost && url.host === siteHost) return null;
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return null;

  return `${url.host}${url.pathname === "/" ? "" : url.pathname}`.slice(0, 200);
}
