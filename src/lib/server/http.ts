import type { ApiErrorCode } from "@/types/api";

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

export function jsonError(code: ApiErrorCode, message: string): Response {
  return new Response(
    JSON.stringify({
      error: { code, message },
    } satisfies import("@/types/api").ApiErrorBody),
    { status: STATUS_BY_CODE[code], headers: JSON_HEADERS }
  );
}

export function jsonOk(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init?.headers ?? {}) },
  });
}
