/**
 * 浏览器 → BFF 调用的唯一 fetch 入口（React 与 Vue island 共用）。
 * 注入匿名设备 id 与当前 Supabase access token（已登录时）；
 * 传输层不启用缓存。
 */
import { CLIENT_ID_HEADER, type ApiErrorBody } from "@/types/api";
import { getClientId } from "@/lib/clientId";
import { getBrowserSupabase } from "@/lib/supabase/client";

/**
 * 携带 HTTP 状态码与业务错误码的请求异常。
 */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

/**
 * 发起带默认头的请求：注入设备 id、JSON content-type 与 bearer token。
 * 返回原生 Response，由调用方自行处理。
 */
export async function apiFetch(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set(CLIENT_ID_HEADER, getClientId());

  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  // 尽力注入 bearer；未登录请求直接省略。
  try {
    const { data } = await getBrowserSupabase().auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.set("authorization", `Bearer ${token}`);
  } catch {
    // Supabase 未配置——请求按匿名处理（服务端返回 503）。
  }

  return fetch(input, { ...init, headers, cache: "no-store" });
}

/** 发起请求并解析 JSON；非 2xx 时抛出带状态码与错误码的 ApiRequestError。 */
export async function apiJson<T>(
  input: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await apiFetch(input, init);
  const body = (await res.json().catch(() => null)) as
    (ApiErrorBody & Record<string, unknown>) | T | null;

  if (!res.ok) {
    const errorBody = body as ApiErrorBody | null;
    throw new ApiRequestError(
      res.status,
      errorBody?.error?.code ?? "HTTP_ERROR",
      errorBody?.error?.message ?? `Request failed (${res.status})`
    );
  }

  return body as T;
}
