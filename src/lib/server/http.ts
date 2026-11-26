import type { ApiErrorCode } from "@/types/api";

/** API 响应统一使用的 JSON 头，禁用缓存。 */
export const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
} as const;

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  POST_NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  RATE_LIMITED: 429,
  SUPABASE_NOT_CONFIGURED: 503,
  INTERNAL_ERROR: 500,
};

/** 按错误码返回带对应状态码的 JSON 错误响应。 */
export function jsonError(code: ApiErrorCode, message: string): Response {
  return new Response(
    JSON.stringify({
      error: { code, message },
    } satisfies import("@/types/api").ApiErrorBody),
    { status: STATUS_BY_CODE[code], headers: JSON_HEADERS }
  );
}

/** 返回 JSON 成功响应，允许调用方追加或覆盖响应头。 */
export function jsonOk(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init?.headers ?? {}) },
  });
}
