// 仅限服务端 — 禁止在客户端组件中导入。
// 由 no-restricted-imports ESLint 规则强制（eslint.config.js）。
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabasePublicEnv } from "@/lib/env";

/**
 * 仅限服务端的客户端，将终端用户的 JWT 透传给 PostgREST，
 * 使 RLS 策略以登录用户身份（而非 service role）求值。
 *
 * 在 BFF 端点校验 bearer token 之后使用。`accessToken` 为用户 JWT。
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
