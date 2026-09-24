import type { APIRoute } from "astro";
import type {
  UaClass,
  ViewportBucket,
  WebVitalMetric,
  WebVitalRating,
} from "@/types/api";
import { jsonError, jsonOk } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rateLimit";
import { hasAdminSupabase, getAdminSupabase } from "@/lib/supabase/admin";
import { dailyVisitorHash, normalizeReferrer } from "@/lib/server/analytics";
import { analyticsEventSchema } from "@/lib/server/analyticsValidation";

export const prerender = false;

const EVENT_WINDOW_MS = 60_000;
const EVENT_LIMIT = 120;
const CLEANUP_PROBABILITY = 0.01;

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!hasAdminSupabase()) {
    return jsonError(
      "SUPABASE_NOT_CONFIGURED",
      "Analytics are unavailable until Supabase env vars are configured."
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError("VALIDATION_ERROR", "Request body must be JSON.");
  }

  const parsed = analyticsEventSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_ERROR",
      parsed.error.issues.map(i => i.message).join("; ")
    );
  }

  const event = parsed.data;
  const visitorHash = dailyVisitorHash(clientAddress, event.clientId);

  if (!rateLimit(`analytics:${visitorHash}`, EVENT_LIMIT, EVENT_WINDOW_MS)) {
    return jsonError("RATE_LIMITED", "Too many requests. Try again later.");
  }

  const admin = getAdminSupabase();
  const day = utcToday();

  try {
    if (event.type === "pageview") {
      const { error } = await admin.rpc("ingest_pageview", {
        p_day: day,
        p_path: event.path,
        p_referrer: normalizeReferrer(event.referrer),
        p_locale: event.locale,
        p_viewport: event.viewport satisfies ViewportBucket,
        p_ua_class: event.uaClass satisfies UaClass,
        p_visitor_hash: visitorHash,
      });
      if (error) throw error;
    } else {
      const { error } = await admin.rpc("ingest_web_vital", {
        p_day: day,
        p_path: event.path,
        p_metric: event.metric satisfies WebVitalMetric,
        p_value: event.value,
        p_rating: event.rating satisfies WebVitalRating,
        p_vital_id: event.id,
        p_visitor_hash: visitorHash,
      });
      if (error) throw error;
    }
  } catch {
    return jsonError("INTERNAL_ERROR", "Failed to record analytics event.");
  }

  // Best-effort retention sweep (never block the response).
  if (Math.random() < CLEANUP_PROBABILITY) {
    admin.rpc("cleanup_analytics_events").then(
      () => {},
      () => {
        // best-effort; next event will trigger it again
      }
    );
  }

  return jsonOk({ accepted: true }, { status: 202 });
};
