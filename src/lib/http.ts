/**
 * Single fetch entry point for all browser → BFF calls (shared by React and
 * Vue islands). Injects the anonymous device id and the current Supabase
 * access token (when signed in); never caches at the transport layer.
 */
import { CLIENT_ID_HEADER, type ApiErrorBody } from "@/types/api";
import { getClientId } from "@/lib/clientId";
import { getBrowserSupabase } from "@/lib/supabase/client";

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

export async function apiFetch(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set(CLIENT_ID_HEADER, getClientId());

  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  // Best-effort bearer injection; unauthenticated requests simply omit it.
  try {
    const { data } = await getBrowserSupabase().auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.set("authorization", `Bearer ${token}`);
  } catch {
    // Supabase not configured — calls go anonymous (and 503 server-side).
  }

  return fetch(input, { ...init, headers, cache: "no-store" });
}

/** fetch + JSON parse + structured error. */
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
