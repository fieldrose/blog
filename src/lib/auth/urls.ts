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
 *
 * 浏览器里优先用当前页面的 origin：`siteUrl` 是构建/启动时固化的
 * PUBLIC_SITE_URL，本地开发若它指向线上域名，登录后会被带到线上回调页。
 * 仅在 SSR（无 window）时退回 `siteUrl`。
 */
export function authCallbackUrl(nextPath?: string): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : siteUrl.replace(/\/+$/, "");
  const base = `${origin}/${currentLocale()}/auth/callback`;
  if (nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")) {
    return `${base}?next=${encodeURIComponent(nextPath)}`;
  }
  return base;
}
