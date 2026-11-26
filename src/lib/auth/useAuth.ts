import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { queryClient } from "@/lib/query/client";
import { queryKeys } from "@/lib/query/keys";
import { authCallbackUrl } from "./urls";

let subscribed = false;

/**
 * 幂等地安装全局的 auth → query cache 桥接。
 * 可在任意 island 中调用，只有首次调用会真正订阅。
 */
function ensureAuthSubscription() {
  if (subscribed) return;
  subscribed = true;

  const supabase = getBrowserSupabase();

  // 初始播种（localStorage 中可能已存在有效 session）。
  supabase.auth.getSession().then(({ data }) => {
    queryClient.setQueryData(queryKeys.authUser(), data.session?.user ?? null);
  });

  supabase.auth.onAuthStateChange(event => {
    supabase.auth.getUser().then(({ data }) => {
      queryClient.setQueryData(queryKeys.authUser(), data.user ?? null);
    });

    // reactions 依赖身份（选中态），登录状态变化时重新请求。
    if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
      queryClient.invalidateQueries({ queryKey: ["reactions"] });
    }
  });
}

/**
 * 读取当前登录用户，来自 React Query 共享缓存。
 * 客户端首次水合前固定返回 null，以避免与服务端 HTML 不一致。
 */
export function useAuthUser(): User | null {
  const { data } = useQuery({
    queryKey: queryKeys.authUser(),
    queryFn: async () => {
      const { data: result } = await getBrowserSupabase().auth.getUser();
      return result.user ?? null;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    initialData: null,
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    ensureAuthSubscription();
  }, []);

  // island 预渲染时没有 session，且共享 QueryClient 可能在后续 island 水合前
  // 已持有 session（UserMenu 会先运行）。首次客户端渲染直接输出已登录态会
  // 与服务端 HTML 不一致（React #418），因此在水合完成前保持未登录态。
  return hydrated ? (data as User | null) : null;
}

/**
 * 认证操作集合：当前用户与登录、注册、登出、GitHub OAuth 方法。
 */
export function useAuth() {
  const user = useAuthUser();
  const reactQueryClient = useQueryClient();

  const signIn = (email: string, password: string) =>
    getBrowserSupabase().auth.signInWithPassword({ email, password });

  /**
   * 注册新账号。
   * Supabase 接受注册但开启了邮箱确认（未返回 session）时，
   * 返回 `needsConfirmation: true`。
   */
  const signUp = async (email: string, password: string) => {
    const result = await getBrowserSupabase().auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: authCallbackUrl(),
      },
    });
    return {
      ...result,
      needsConfirmation: !result.data.session && !result.error,
    };
  };

  const signOut = async () => {
    const { error } = await getBrowserSupabase().auth.signOut();
    reactQueryClient.setQueryData(queryKeys.authUser(), null);
    return { error };
  };

  const signInWithGithub = (nextPath?: string) =>
    getBrowserSupabase().auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: authCallbackUrl(nextPath),
      },
    });

  return { user, signIn, signUp, signOut, signInWithGithub };
}
