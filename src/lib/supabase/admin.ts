// 仅限服务端 — 禁止在客户端组件中导入。
// 由 no-restricted-imports ESLint 规则强制（eslint.config.js）。
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_ROLE_KEY } from "astro:env/server";
import { hasSupabasePublicEnv, supabasePublicEnv } from "@/lib/env";

let adminClient: SupabaseClient | null = null;

/** 当前运行时是否具备 service-role 访问能力。 */
export function hasAdminSupabase(): boolean {
  return Boolean(hasSupabasePublicEnv && SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * 仅限服务端的 Supabase 客户端，使用 service_role key（绕过 RLS）。
 * `server-only` 导入使任何误在客户端引入的行为直接变成构建错误。
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
