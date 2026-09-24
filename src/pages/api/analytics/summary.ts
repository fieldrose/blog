import type { APIRoute } from "astro";
import {
  REACTION_TYPES,
  WEB_VITAL_METRICS,
  WEB_VITAL_RATINGS,
  type AnalyticsSummaryResponse,
  type ReactionType,
  type ReactionCounts,
  type WebVitalMetric,
  type WebVitalRating,
} from "@/types/api";
import { jsonError } from "@/lib/server/http";
import { hasSupabase, getAnonSupabase } from "@/lib/supabase/anon";

export const prerender = false;

function zeroReactions(): ReactionCounts {
  return { like: 0, fire: 0, idea: 0, question: 0 };
}

function zeroVitals(): AnalyticsSummaryResponse["vitals"] {
  return Object.fromEntries(
    WEB_VITAL_METRICS.map(metric => [
      metric,
      Object.fromEntries(
        WEB_VITAL_RATINGS.map(rating => [rating, 0])
      ) as Record<WebVitalRating, number>,
    ])
  ) as Record<WebVitalMetric, Record<WebVitalRating, number>>;
}

export const GET: APIRoute = async () => {
  if (!hasSupabase()) {
    return jsonError(
      "SUPABASE_NOT_CONFIGURED",
      "Analytics are unavailable until Supabase env vars are configured."
    );
  }

  const supabase = getAnonSupabase();

  try {
    const [dailyRes, topRes, vitalsRes, totalsRes] = await Promise.all([
      supabase
        .schema("public")
        .from("stats_30d_daily")
        .select("day,pv,uv")
        .order("day", { ascending: true }),
      supabase
        .schema("public")
        .from("stats_30d_top_posts")
        .select("path,views"),
      supabase
        .schema("public")
        .from("stats_30d_vitals")
        .select("metric,rating,n"),
      supabase
        .schema("public")
        .from("reaction_totals")
        .select("reaction,count"),
    ]);

    if (dailyRes.error || topRes.error || vitalsRes.error || totalsRes.error) {
      throw new Error("One or more analytics view reads failed.");
    }

    const reactions = zeroReactions();
    for (const row of totalsRes.data ?? []) {
      const reaction = row.reaction as ReactionType;
      if (REACTION_TYPES.includes(reaction))
        reactions[reaction] = row.count as number;
    }

    const vitals = zeroVitals();
    for (const row of vitalsRes.data ?? []) {
      const metric = row.metric as WebVitalMetric;
      const rating = row.rating as WebVitalRating;
      if (
        WEB_VITAL_METRICS.includes(metric) &&
        WEB_VITAL_RATINGS.includes(rating)
      ) {
        vitals[metric][rating] = row.n as number;
      }
    }

    const body: AnalyticsSummaryResponse = {
      daily: (dailyRes.data ?? []).map(row => ({
        day: String(row.day),
        pv: Number(row.pv),
        uv: Number(row.uv),
      })),
      topPosts: (topRes.data ?? []).map(row => ({
        path: String(row.path),
        views: Number(row.views),
      })),
      vitals,
      reactions,
    };

    return Response.json(body, {
      headers: { "cache-control": "public, max-age=30" },
    });
  } catch {
    return jsonError("INTERNAL_ERROR", "Failed to read analytics summary.");
  }
};
