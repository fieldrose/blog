/**
 * Web Vitals collection (Core Web Vitals: LCP, CLS, INP).
 * Sampling is deterministic per device — hashing clientId into the first
 * quarter of the space means the same visitor is always/never sampled,
 * which keeps per-device series consistent at ~25% traffic.
 */
import { onCLS, onINP, onLCP } from "web-vitals";
import { getClientId } from "@/lib/clientId";
import type {
  AnalyticsEventBody,
  WebVitalMetric,
  WebVitalRating,
} from "@/types/api";

const METRIC_NAME: Record<string, WebVitalMetric> = {
  LCP: "lcp",
  CLS: "cls",
  INP: "inp",
};

/** Stable 25% selection from the first two hex chars of clientId. */
export function isVitalsSample(clientId: string): boolean {
  const head = clientId.replace(/-/g, "").slice(0, 2);
  const n = Number.parseInt(head, 16);
  return Number.isFinite(n) && n < 64; // 0..63 out of 0..255
}

export function initWebVitals(): void {
  try {
    const clientId = getClientId();
    if (!clientId || !isVitalsSample(clientId)) return;
    // Honour "Do Not Track": vitals are still anonymous, but opt-out means opt-out.
    if (navigator.doNotTrack === "1") return;

    const report = (metric: {
      name: string;
      value: number;
      rating: string;
      id: string;
    }) => {
      const name = METRIC_NAME[metric.name];
      if (!name) return;
      const body: AnalyticsEventBody = {
        type: "web-vital",
        clientId,
        path: location.pathname,
        metric: name,
        value: metric.value,
        rating: metric.rating as WebVitalRating,
        id: metric.id,
      };
      try {
        const blob = new Blob([JSON.stringify(body)], {
          type: "application/json",
        });
        navigator.sendBeacon?.("/api/analytics/collect", blob);
      } catch {
        // silent
      }
    };

    onLCP(report);
    onCLS(report);
    onINP(report);
  } catch {
    // silent
  }
}
