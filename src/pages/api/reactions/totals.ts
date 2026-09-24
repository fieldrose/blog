import type { APIRoute } from "astro";
import {
  REACTION_TYPES,
  type ReactionCounts,
  type ReactionTotalsResponse,
  type ReactionType,
} from "@/types/api";
import { jsonError, jsonOk } from "@/lib/server/http";
import { getAnonSupabase, hasSupabase } from "@/lib/supabase/anon";

export const prerender = false;

/**
 * Site-wide reaction totals, used by the cross-framework TanStack Query demo.
 * Static route ("totals") takes precedence over the [...slug] catch-all.
 * The reaction_totals view is publicly readable (anon granted in 0001 migration).
 */
export const GET: APIRoute = async () => {
  if (!hasSupabase()) {
    return jsonError(
      "SUPABASE_NOT_CONFIGURED",
      "Reactions are unavailable until Supabase env vars are configured."
    );
  }

  try {
    const supabase = getAnonSupabase();
    const { data, error } = await supabase
      .schema("public")
      .from("reaction_totals")
      .select("reaction, count");

    if (error) throw error;

    const totals: ReactionCounts = {
      like: 0,
      fire: 0,
      idea: 0,
      question: 0,
    };
    for (const row of data ?? []) {
      const reaction = row.reaction as ReactionType;
      if (REACTION_TYPES.includes(reaction))
        totals[reaction] = row.count as number;
    }

    const body: ReactionTotalsResponse = { totals };
    return jsonOk(body, {
      headers: { "cache-control": "public, max-age=30" },
    });
  } catch {
    return jsonError("INTERNAL_ERROR", "Failed to read reaction totals.");
  }
};
