// 仅限服务端 — 面向公开读取（聚合视图 / 已发布数据）的无状态匿名 Supabase 客户端。
// RLS 生效方式与浏览器端完全一致。
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { hasSupabasePublicEnv, supabasePublicEnv } from "@/lib/env";

let anonClient: SupabaseClient | null = null;

/** 是否已配置 Supabase 公开环境变量。 */
export function hasSupabase(): boolean {
  return hasSupabasePublicEnv;
}

/**
 * 获取（惰性创建）匿名 Supabase 客户端，不持久化 session。
 * 缺少公开环境变量时抛错。
 */
export function getAnonSupabase(): SupabaseClient {
  if (anonClient) return anonClient;

  if (!hasSupabasePublicEnv) {
    throw new Error(
      "Supabase is not configured: set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  anonClient = createClient(supabasePublicEnv.url, supabasePublicEnv.anonKey, {
    auth: { persistSession: false },
  });

  return anonClient;
}
