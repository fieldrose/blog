import { siteUrl } from "@/lib/env";
import { locales } from "@/i18n/locales";

/** Locale of the current page path, falling back to the default (zh). */
export function currentLocale(): string {
  if (typeof window === "undefined") return "zh";
  const segment = window.location.pathname.split("/").filter(Boolean)[0];
  return locales.some(loc => loc.code === segment) ? segment : "zh";
}

/**
 * Localized OAuth/email callback URL, e.g.
 * http://localhost:4321/zh/auth/callback
 */
export function authCallbackUrl(nextPath?: string): string {
  const base = `${siteUrl.replace(/\/+$/, "")}/${currentLocale()}/auth/callback`;
  if (nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")) {
    return `${base}?next=${encodeURIComponent(nextPath)}`;
  }
  return base;
}
