import { siteUrl } from "@/lib/env";
import { locales } from "@/i18n/locales";

/** 当前页面路径所属的 locale，无法识别时回退到默认值 zh。 */
export function currentLocale(): string {
  if (typeof window === "undefined") return "zh";
  const segment = window.location.pathname.split("/").filter(Boolean)[0];
  return locales.some(loc => loc.code === segment) ? segment : "zh";
}

/**
 * 带 locale 的 OAuth/邮箱回调 URL，例如
 * http://localhost:4321/zh/auth/callback
 *
 * 浏览器里优先用当前页面的 origin：`siteUrl` 是构建/启动时固化的
 * PUBLIC_SITE_URL，本地开发若它指向线上域名，登录后会被带到线上回调页。
 * 仅在 SSR（无 window）时退回 `siteUrl`。
 *
 * `nextPath` 仅接受以单个 `/` 开头的站内路径，用于登录后跳回原页面。
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
