import { useId } from "react";
import type { ReactionType } from "@/types/api";
import { REACTION_TYPES } from "@/types/api";
import QueryProvider from "@/lib/query/QueryProvider";
import { useReactions, useToggleReaction } from "@/lib/query/useReactions";
import { ApiRequestError } from "@/lib/http";

export interface PostReactionsLabels {
  heading: string;
  like: string;
  fire: string;
  idea: string;
  question: string;
  unavailable: string;
}

const EMOJI: Record<ReactionType, string> = {
  like: "\u{1F44D}",
  fire: "\u{1F525}",
  idea: "\u{1F4A1}",
  question: "\u2753",
};

function ReactionsBar({
  slug,
  labels,
}: {
  slug: string;
  labels: PostReactionsLabels;
}) {
  const headingId = useId();
  const { data, isLoading, isError, error, refetch, isFetching } =
    useReactions(slug);
  const mutation = useToggleReaction(slug);

  // Backend missing / post unknown — degrade to a quiet inline note.
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

  const counts = data?.counts;
  const selected = new Set(data?.selected ?? []);

  return (
    <div
      role="group"
      aria-labelledby={headingId}
      className="flex flex-wrap items-center gap-2"
    >
      <span id={headingId} className="sr-only">
        {labels.heading}
      </span>

      {REACTION_TYPES.map(reaction => {
        const active = selected.has(reaction);
        const disabled = isLoading || mutation.isPending || isFetching;
        return (
          <button
            key={reaction}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => mutation.mutate({ reaction, active })}
            className={[
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
              "disabled:cursor-not-allowed disabled:opacity-60",
              active
                ? "border-accent bg-accent/10 text-accent font-medium"
                : "border-border text-muted-foreground hover:border-accent hover:text-accent",
            ].join(" ")}
          >
            <span aria-hidden="true">{EMOJI[reaction]}</span>
            <span>{labels[reaction]}</span>
            <span className="tabular-nums" data-testid={`count-${reaction}`}>
              {counts?.[reaction] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Hydrated with client:visible (React ships only when scrolled into view).
 * Wraps itself in the shared QueryClient provider.
 */
export default function PostReactions({
  slug,
  labels,
}: {
  slug: string;
  labels: PostReactionsLabels;
}) {
  return (
    <QueryProvider>
      <ReactionsBar slug={slug} labels={labels} />
    </QueryProvider>
  );
}
