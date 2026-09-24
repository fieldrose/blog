import type { APIRoute } from "astro";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  REACTION_TYPES,
  CLIENT_ID_HEADER,
  type ReactionCounts,
  type ReactionType,
  type ReactionsResponse,
} from "@/types/api";
import { isPublishedPostSlug, normalizeSlug } from "@/lib/server/posts";
import { jsonError, jsonOk } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rateLimit";
import { authenticate, dailyRateLimitKey } from "@/lib/server/auth";
import {
  voteBodySchema,
  reactionParamSchema,
  clientIdSchema,
} from "@/lib/server/reactionValidation";
import { hasSupabase, getAnonSupabase } from "@/lib/supabase/anon";
import { hasAdminSupabase, getAdminSupabase } from "@/lib/supabase/admin";
import { getUserSupabase } from "@/lib/supabase/asUser";

export const prerender = false;

const WRITE_WINDOW_MS = 60_000;
const USER_WRITE_LIMIT = 60;
const ANON_WRITE_LIMIT = 30;

function zeroCounts(): ReactionCounts {
  return { like: 0, fire: 0, idea: 0, question: 0 };
}

function readClientId(request: Request): string | null {
  const raw = request.headers.get(CLIENT_ID_HEADER);
  if (!raw) return null;
  const parsed = clientIdSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

async function fetchState(
  supabase: SupabaseClient,
  slug: string,
  identity: { userId?: string; clientId?: string }
): Promise<ReactionsResponse> {
  const counts = zeroCounts();

  const { data: countRows, error: countError } = await supabase
    .schema("public")
    .from("reaction_counts")
    .select("reaction, count")
    .eq("post_slug", slug);

  if (countError) throw countError;

  for (const row of countRows ?? []) {
    const reaction = row.reaction as ReactionType;
    if (REACTION_TYPES.includes(reaction))
      counts[reaction] = row.count as number;
  }

  let query = supabase
    .schema("public")
    .from("reactions")
    .select("reaction")
    .eq("post_slug", slug);

  if (identity.userId) {
    query = query.eq("user_id", identity.userId);
  } else if (identity.clientId) {
    query = query.eq("client_id", identity.clientId);
  } else {
    return { counts, selected: [] };
  }

  const { data: selectedRows, error: selectedError } = await query;
  if (selectedError) throw selectedError;

  const selected = (selectedRows ?? [])
    .map(row => row.reaction as ReactionType)
    .filter(reaction => REACTION_TYPES.includes(reaction));

  return { counts, selected };
}

export const GET: APIRoute = async ({ params, request }) => {
  const slug = normalizeSlug(params.slug ?? "");
  if (!(await isPublishedPostSlug(slug))) {
    return jsonError("POST_NOT_FOUND", `No published post matches "${slug}".`);
  }

  if (!hasSupabase()) {
    return jsonError(
      "SUPABASE_NOT_CONFIGURED",
      "Reactions are unavailable until Supabase env vars are configured."
    );
  }

  const auth = await authenticate(request);
  const clientId = readClientId(request);

  try {
    const supabase =
      auth.kind === "user" ? getUserSupabase(auth.token) : getAnonSupabase();

    const state = await fetchState(
      supabase,
      slug,
      auth.kind === "user"
        ? { userId: auth.userId }
        : { clientId: clientId ?? undefined }
    );

    return jsonOk(state, {
      headers: { "cache-control": "private, no-store" },
    });
  } catch {
    return jsonError("INTERNAL_ERROR", "Failed to read reactions.");
  }
};

export const POST: APIRoute = async ({ params, request, clientAddress }) => {
  const slug = normalizeSlug(params.slug ?? "");
  if (!(await isPublishedPostSlug(slug))) {
    return jsonError("POST_NOT_FOUND", `No published post matches "${slug}".`);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError("VALIDATION_ERROR", "Request body must be JSON.");
  }

  const parsed = voteBodySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_ERROR",
      parsed.error.issues.map(i => i.message).join("; ")
    );
  }

  const auth = await authenticate(request);
  if (auth.kind === "invalid") {
    return jsonError("UNAUTHORIZED", "Invalid or expired session token.");
  }

  const { reaction } = parsed.data;

  try {
    if (auth.kind === "user") {
      if (
        !rateLimit(
          dailyRateLimitKey(clientAddress, `user-${auth.userId}`),
          USER_WRITE_LIMIT,
          WRITE_WINDOW_MS
        )
      ) {
        return jsonError("RATE_LIMITED", "Too many requests. Try again later.");
      }

      const supabase = getUserSupabase(auth.token);
      const { error } = await supabase
        .schema("public")
        .from("reactions")
        .upsert(
          { post_slug: slug, reaction, user_id: auth.userId },
          { onConflict: "post_slug,reaction,user_id", ignoreDuplicates: true }
        );
      if (error) throw error;

      const state = await fetchState(supabase, slug, { userId: auth.userId });
      return jsonOk(state);
    }

    // Anonymous path: requires a valid client_id (sent as a header by
    // apiFetch) and the service-role client.
    const clientId = readClientId(request);
    if (!clientId) {
      return jsonError(
        "VALIDATION_ERROR",
        "Anonymous votes require a client_id (UUID)."
      );
    }
    if (!hasAdminSupabase()) {
      return jsonError(
        "SUPABASE_NOT_CONFIGURED",
        "Anonymous reactions need SUPABASE_SERVICE_ROLE_KEY on the server."
      );
    }
    if (
      !rateLimit(
        dailyRateLimitKey(clientAddress, "anon"),
        ANON_WRITE_LIMIT,
        WRITE_WINDOW_MS
      )
    ) {
      return jsonError("RATE_LIMITED", "Too many requests. Try again later.");
    }

    const admin = getAdminSupabase();
    const { error } = await admin
      .schema("public")
      .from("reactions")
      .upsert(
        { post_slug: slug, reaction, client_id: clientId },
        { onConflict: "post_slug,reaction,client_id", ignoreDuplicates: true }
      );
    if (error) throw error;

    const state = await fetchState(admin, slug, { clientId });
    return jsonOk(state);
  } catch {
    return jsonError("INTERNAL_ERROR", "Failed to record reaction.");
  }
};

export const DELETE: APIRoute = async ({ params, request, clientAddress }) => {
  const slug = normalizeSlug(params.slug ?? "");
  if (!(await isPublishedPostSlug(slug))) {
    return jsonError("POST_NOT_FOUND", `No published post matches "${slug}".`);
  }

  const reaction = reactionParamSchema.safeParse(
    new URL(request.url).searchParams.get("reaction")
  );
  if (!reaction.success) {
    return jsonError("VALIDATION_ERROR", 'Query param "reaction" is required.');
  }

  const auth = await authenticate(request);
  if (auth.kind === "invalid") {
    return jsonError("UNAUTHORIZED", "Invalid or expired session token.");
  }

  try {
    if (auth.kind === "user") {
      if (
        !rateLimit(
          dailyRateLimitKey(clientAddress, `user-${auth.userId}`),
          USER_WRITE_LIMIT,
          WRITE_WINDOW_MS
        )
      ) {
        return jsonError("RATE_LIMITED", "Too many requests. Try again later.");
      }

      const supabase = getUserSupabase(auth.token);
      const { error } = await supabase
        .schema("public")
        .from("reactions")
        .delete()
        .eq("post_slug", slug)
        .eq("reaction", reaction.data)
        .eq("user_id", auth.userId);
      if (error) throw error;

      const state = await fetchState(supabase, slug, { userId: auth.userId });
      return jsonOk(state);
    }

    const clientId = readClientId(request);
    if (!clientId) {
      return jsonError(
        "VALIDATION_ERROR",
        "Anonymous votes require an x-client-id header."
      );
    }
    if (!hasAdminSupabase()) {
      return jsonError(
        "SUPABASE_NOT_CONFIGURED",
        "Anonymous reactions need SUPABASE_SERVICE_ROLE_KEY on the server."
      );
    }
    if (
      !rateLimit(
        dailyRateLimitKey(clientAddress, "anon"),
        ANON_WRITE_LIMIT,
        WRITE_WINDOW_MS
      )
    ) {
      return jsonError("RATE_LIMITED", "Too many requests. Try again later.");
    }

    const admin = getAdminSupabase();
    const { error } = await admin
      .schema("public")
      .from("reactions")
      .delete()
      .eq("post_slug", slug)
      .eq("reaction", reaction.data)
      .eq("client_id", clientId);
    if (error) throw error;

    const state = await fetchState(admin, slug, { clientId });
    return jsonOk(state);
  } catch {
    return jsonError("INTERNAL_ERROR", "Failed to remove reaction.");
  }
};
