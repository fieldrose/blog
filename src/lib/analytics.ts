/**
 * Privacy-friendly, cookie-free analytics SDK.
 * - sendBeacon with a keepalive fetch fallback
 * - silent failure: ad blockers or a dead endpoint must never break the page
 * - only coarse, non-identifying fields leave the browser
 */
import type { AnalyticsEventBody, UaClass, ViewportBucket } from "@/types/api";
import { getClientId } from "@/lib/clientId";

const ENDPOINT = "/api/analytics/collect";

export function viewportBucket(
  width: number = window.innerWidth
): ViewportBucket {
  if (width < 480) return "xs";
  if (width < 768) return "sm";
  if (width < 1024) return "md";
  return "lg";
}

export function classifyUserAgent(ua: string = navigator.userAgent): UaClass {
  if (
    /iPad|Tablet|Kindle|Silk/i.test(ua) ||
    (/Android/i.test(ua) && !/Mobile/i.test(ua))
  ) {
    return "tablet";
  }
  if (/Mobi|iPhone|iPod|Android/i.test(ua)) return "mobile";
  return "desktop";
}

function postEvent(body: AnalyticsEventBody): void {
  const payload = JSON.stringify(body);

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon(ENDPOINT, blob)) return;
    }
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => {
      // silent
    });
  } catch {
    // sendBeacon threw (e.g. blocked by an extension) — nothing to do.
  }
}

/** Report one page view. Safe to call on first load and after every swap. */
export function trackPageview(locale: string): void {
  try {
    const body: AnalyticsEventBody = {
      type: "pageview",
      clientId: getClientId(),
      path: location.pathname,
      referrer: document.referrer || null,
      locale,
      viewport: viewportBucket(),
      uaClass: classifyUserAgent(),
    };
    postEvent(body);
  } catch {
    // silent
  }
}
