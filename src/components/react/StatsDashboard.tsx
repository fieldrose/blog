import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  REACTION_TYPES,
  WEB_VITAL_METRICS,
  WEB_VITAL_RATINGS,
  type AnalyticsSummaryResponse,
  type ReactionType,
  type WebVitalMetric,
  type WebVitalRating,
} from "@/types/api";
import QueryProvider from "@/lib/query/QueryProvider";
import { useStatsSummary } from "@/lib/query/useStats";
import { ApiRequestError } from "@/lib/http";

export interface StatsDashboardLabels {
  loading: string;
  unavailable: string;
  noData: string;
  pvLabel: string;
  uvLabel: string;
  topPostsTitle: string;
  vitalsTitle: string;
  reactionsTitle: string;
  metricLabels: Record<WebVitalMetric, string>;
  ratingLabels: Record<WebVitalRating, string>;
  reactionLabels: Record<ReactionType, string>;
  totalPv: string;
  totalUv: string;
  viewsLabel: string;
}

const REACTION_EMOJI: Record<ReactionType, string> = {
  like: "\u{1F44D}",
  fire: "\u{1F525}",
  idea: "\u{1F4A1}",
  question: "\u{2753}",
};

const RATING_COLOR: Record<WebVitalRating, string> = {
  good: "bg-emerald-500",
  "needs-improvement": "bg-amber-500",
  poor: "bg-red-500",
};

/** UTC day key, n days ago → "YYYY-MM-DD". */
function dayKey(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

/** Zero-filled trailing-30-day series so the chart is always continuous. */
function fillDaily(data: AnalyticsSummaryResponse["daily"]) {
  const byDay = new Map(data.map(row => [row.day, row]));
  return Array.from({ length: 30 }, (_, i) => {
    const key = dayKey(29 - i);
    const row = byDay.get(key);
    return { day: key, pv: row?.pv ?? 0, uv: row?.uv ?? 0 };
  });
}

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

function DailyChart({
  daily,
  labels,
}: {
  daily: AnalyticsSummaryResponse["daily"];
  labels: StatsDashboardLabels;
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const height = 180;
  const padX = 4;
  const padY = 16;
  const series = fillDaily(daily);
  const max = Math.max(1, ...series.map(d => Math.max(d.pv, d.uv)));
  const innerW = Math.max(0, width - padX * 2);
  const innerH = height - padY * 2;
  const x = (i: number) =>
    padX + (series.length <= 1 ? 0 : (i / (series.length - 1)) * innerW);
  const y = (v: number) => padY + innerH - (v / max) * innerH;

  const line = (key: "pv" | "uv") =>
    series
      .map(
        (d, i) =>
          `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`
      )
      .join(" ");

  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <>
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={`${labels.pvLabel} / ${labels.uvLabel}, 30d`}
          >
            {[0.25, 0.5, 0.75, 1].map(t => (
              <line
                key={t}
                x1={padX}
                x2={width - padX}
                y1={padY + innerH * (1 - t)}
                y2={padY + innerH * (1 - t)}
                className="stroke-border"
                strokeWidth={1}
              />
            ))}
            <path
              d={line("pv")}
              fill="none"
              className="stroke-accent"
              strokeWidth={2}
            />
            <path
              d={line("uv")}
              fill="none"
              className="stroke-muted-foreground"
              strokeWidth={2}
              strokeDasharray="4 3"
            />
          </svg>
          <div className="text-muted-foreground mt-1 flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span
                className="bg-accent inline-block h-0.5 w-4"
                aria-hidden="true"
              />
              {labels.pvLabel}
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="bg-muted-foreground inline-block h-0.5 w-4"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg,currentColor 0 4px,transparent 4px 7px)",
                }}
                aria-hidden="true"
              />
              {labels.uvLabel}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-border rounded-2xl border p-5">
      <h3 className="text-muted-foreground mb-4 text-sm font-semibold tracking-wide uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Dashboard({ labels }: { labels: StatsDashboardLabels }) {
  const { data, isLoading, isError, error, refetch } = useStatsSummary();

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <p className="text-muted-foreground text-sm">{labels.loading}</p>
        <div className="border-border h-44 animate-pulse rounded-2xl border" />
      </div>
    );
  }

  if (isError && !data) {
    const unavailable =
      error instanceof ApiRequestError &&
      (error.status === 503 || error.status === 404);
    return (
      <p className="text-muted-foreground text-sm">
        {unavailable ? (
          labels.unavailable
        ) : (
          <button
            type="button"
            className="hover:text-accent underline underline-offset-4"
            onClick={() => refetch()}
          >
            {labels.unavailable}
          </button>
        )}
      </p>
    );
  }

  const stats = data as AnalyticsSummaryResponse;
  const totalPv = stats.daily.reduce((sum, d) => sum + d.pv, 0);
  const totalUv = stats.daily.reduce((sum, d) => sum + d.uv, 0);
  const maxViews = Math.max(1, ...stats.topPosts.map(p => p.views));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="border-border rounded-2xl border p-5">
          <p className="text-muted-foreground text-xs">{labels.totalPv}</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{totalPv}</p>
        </div>
        <div className="border-border rounded-2xl border p-5">
          <p className="text-muted-foreground text-xs">{labels.totalUv}</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{totalUv}</p>
        </div>
      </div>

      <Card title={labels.pvLabel}>
        <DailyChart daily={stats.daily} labels={labels} />
      </Card>

      <Card title={labels.topPostsTitle}>
        {stats.topPosts.length === 0 ? (
          <p className="text-muted-foreground text-sm">{labels.noData}</p>
        ) : (
          <ul className="space-y-2.5">
            {stats.topPosts.map(post => (
              <li key={post.path}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-mono text-xs">
                    {post.path}
                  </span>
                  <span className="text-muted-foreground shrink-0 tabular-nums">
                    {post.views} {labels.viewsLabel}
                  </span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-accent h-full rounded-full"
                    style={{ width: `${(post.views / maxViews) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={labels.vitalsTitle}>
        <ul className="space-y-3">
          {WEB_VITAL_METRICS.map(metric => {
            const counts = WEB_VITAL_RATINGS.map(
              rating => stats.vitals[metric]?.[rating] ?? 0
            );
            const total = counts.reduce((a, b) => a + b, 0);
            return (
              <li key={metric}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{labels.metricLabels[metric]}</span>
                  <span className="text-muted-foreground tabular-nums">
                    n={total}
                  </span>
                </div>
                <div className="bg-muted flex h-2.5 overflow-hidden rounded-full">
                  {total === 0 ? (
                    <span className="text-muted-foreground text-xs">
                      {labels.noData}
                    </span>
                  ) : (
                    WEB_VITAL_RATINGS.map((rating, i) =>
                      counts[i] > 0 ? (
                        <span
                          key={rating}
                          title={`${labels.ratingLabels[rating]}: ${counts[i]}`}
                          className={RATING_COLOR[rating]}
                          style={{ width: `${(counts[i] / total) * 100}%` }}
                        />
                      ) : null
                    )
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <ul className="text-muted-foreground mt-4 flex flex-wrap gap-4 text-xs">
          {WEB_VITAL_RATINGS.map(rating => (
            <li key={rating} className="flex items-center gap-1.5">
              <span
                className={`inline-block size-2.5 rounded-full ${RATING_COLOR[rating]}`}
                aria-hidden="true"
              />
              {labels.ratingLabels[rating]}
            </li>
          ))}
        </ul>
      </Card>

      <Card title={labels.reactionsTitle}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {REACTION_TYPES.map(reaction => (
            <div
              key={reaction}
              className="border-border flex flex-col items-center rounded-xl border py-3"
            >
              <span aria-hidden="true" className="text-xl">
                {REACTION_EMOJI[reaction]}
              </span>
              <span className="mt-1 text-lg font-semibold tabular-nums">
                {stats.reactions[reaction] ?? 0}
              </span>
              <span className="text-muted-foreground text-xs">
                {labels.reactionLabels[reaction]}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default function StatsDashboard({
  labels,
}: {
  labels: StatsDashboardLabels;
}) {
  return (
    <QueryProvider>
      <Dashboard labels={labels} />
    </QueryProvider>
  );
}
