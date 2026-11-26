/**
 * 客户端 PUBLIC 环境变量的类型化安全访问层。
 *
 * astro.config.ts 中所有 Supabase 变量均声明为 `optional`，
 * 使 CI 与本地构建无需密钥即可完成。因此功能代码必须检查 `has*` 标志，
 * 而不能假定变量一定存在。
 */
import {
  PUBLIC_SITE_URL,
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY,
} from "astro:env/client";

/** 站点绝对地址，未配置时回退到本地开发地址。 */
export const siteUrl = PUBLIC_SITE_URL ?? "http://localhost:4321/";

/** 浏览器端 Supabase 公开配置，缺省为空字符串。 */
export const supabasePublicEnv = {
  url: PUBLIC_SUPABASE_URL ?? "",
  anonKey: PUBLIC_SUPABASE_ANON_KEY ?? "",
};

/** 是否具备构造浏览器端/admin Supabase 客户端所需的环境变量。 */
export const hasSupabasePublicEnv = Boolean(
  supabasePublicEnv.url && supabasePublicEnv.anonKey
);
