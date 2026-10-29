import type { APIRoute } from "astro";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  REACTION_TYPES,
  type ReactionCounts,
  type ReactionType,
  type ReactionsResponse,
} from "@/types/api";
import { isPublishedPostSlug, normalizeSlug } from "@/lib/server/posts";
import { jsonError, jsonOk } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rateLimit";
import { authenticate, dailyRateLimitKey } from "@/lib/server/auth";
import { voteBodySchema, reactionParamSchema } from "@/lib/server/reactionValidation";
import { hasSupabase, getAnonSupabase } from "@/lib/supabase/anon";
import { getUserSupabase } from "@/lib/supabase/asUser";

export const prerender = false;

const WRITE_WINDOW_MS = 60_000;
const USER_WRITE_LIMIT = 60;

function zeroCounts(): ReactionCounts {
  return { like: 0, fire: 0, idea: 0, question: 0 };
}

async function fetchState(
  supabase: SupabaseClient,
  slug: string,
  userId?: string
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

  if (!userId) {
    return { counts, selected: [] };
  }

  const { data: selectedRows, error: selectedError } = await supabase
    .schema("public")
    .from("reactions")
    .select("reaction")
    .eq("post_slug", slug)
    .eq("user_id", userId);

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

  try {
    const supabase =
      auth.kind === "user" ? getUserSupabase(auth.token) : getAnonSupabase();

    const state = await fetchState(
      supabase,
      slug,
      auth.kind === "user" ? auth.userId : undefined
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
  if (auth.kind !== "user") {
    return jsonError("UNAUTHORIZED", "Sign in to react to posts.");
  }

  const { reaction } = parsed.data;

  try {
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

    const state = await fetchState(supabase, slug, auth.userId);
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
  if (auth.kind !== "user") {
    return jsonError("UNAUTHORIZED", "Sign in to react to posts.");
  }

  try {
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

    const state = await fetchState(supabase, slug, auth.userId);
    return jsonOk(state);
  } catch {
    return jsonError("INTERNAL_ERROR", "Failed to remove reaction.");
  }
};
