// 仅限服务端 — BFF 路由的请求认证辅助函数。
import { createHash } from "node:crypto";
import { SUPABASE_SERVICE_ROLE_KEY } from "astro:env/server";
import { supabasePublicEnv } from "@/lib/env";
import { getUserSupabase } from "@/lib/supabase/asUser";

export type AuthResult =
  | { kind: "user"; token: string; userId: string }
  | { kind: "anon" }
  /** 请求携带了 Bearer token，但 Supabase 校验未通过。 */
  | { kind: "invalid" };

/** 从 Authorization 头提取 Bearer token，缺失或为空时返回 null。 */
export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

/**
 * 解析调用者身份。
 * - 有效 JWT  → 用户身份
 * - 无 token   → 匿名
 * - token 无效 → invalid（写操作路由应返回 401，而非静默降级）
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
 * 用于限流的不可逆每日 key。原始 IP 不会被存储；
 * key 每天轮换，并以仅服务端持有的密钥加盐。
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
