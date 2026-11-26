import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { hasSupabasePublicEnv, supabasePublicEnv } from "@/lib/env";

let browserClient: SupabaseClient | null = null;

/**
 * 浏览器端 Supabase 客户端（PKCE 流程，持久化 session）。
 * 可在客户端组件中安全调用；仅在实际使用而缺少所需 PUBLIC 环境变量时抛错。
 */
export function getBrowserSupabase(): SupabaseClient {
  if (browserClient) return browserClient;

  if (!hasSupabasePublicEnv) {
    throw new Error(
      "Supabase is not configured: set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY in .env.local."
    );
  }

  browserClient = createClient(
    supabasePublicEnv.url,
    supabasePublicEnv.anonKey,
    {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );

  return browserClient;
}
