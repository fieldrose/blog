import { useState } from "react";
import { useId } from "react";
import type { ReactionType } from "@/types/api";
import { REACTION_TYPES } from "@/types/api";
import QueryProvider from "@/lib/query/QueryProvider";
import { useReactions, useToggleReaction } from "@/lib/query/useReactions";
import { useAuthUser } from "@/lib/auth/useAuth";
import AuthDialog, { type AuthLabels } from "./AuthDialog";
import { ApiRequestError } from "@/lib/http";

export interface PostReactionsLabels {
  heading: string;
  like: string;
  fire: string;
  idea: string;
  question: string;
  unavailable: string;
  signInToReact: string;
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
  authLabels,
}: {
  slug: string;
  labels: PostReactionsLabels;
  authLabels: AuthLabels;
}) {
  const headingId = useId();
  const { data, isLoading, isError, error, refetch, isFetching } =
    useReactions(slug);
  const mutation = useToggleReaction(slug);
  const user = useAuthUser();
  const [authOpen, setAuthOpen] = useState(false);

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
  const signedOut = !user;
  const buttonDisabled = signedOut || isLoading || mutation.isPending || isFetching;

  return (
    <>
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
          return (
            <button
              key={reaction}
              type="button"
              aria-pressed={active}
              aria-disabled={buttonDisabled}
              title={signedOut ? labels.signInToReact : undefined}
              disabled={buttonDisabled}
              onClick={() => {
                if (signedOut) {
                  setAuthOpen(true);
                  return;
                }
                mutation.mutate({ reaction, active });
              }}
              className={[
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
                signedOut
                  ? "cursor-help border-border text-muted-foreground hover:border-accent/50"
                  : "disabled:cursor-not-allowed disabled:opacity-60",
                active
                  ? "border-accent bg-accent/10 text-accent font-medium"
                  : !signedOut &&
                    "border-border text-muted-foreground hover:border-accent hover:text-accent",
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
        {signedOut && (
          <span className="text-muted-foreground ml-1 text-xs">
            {labels.signInToReact}
          </span>
        )}
      </div>
      {authOpen && (
        <AuthDialog labels={authLabels} onClose={() => setAuthOpen(false)} />
      )}
    </>
  );
}

/**
 * Hydrated with client:visible (React ships only when scrolled into view).
 * Wraps itself in the shared QueryClient provider.
 */
export default function PostReactions({
  slug,
  labels,
  authLabels,
}: {
  slug: string;
  labels: PostReactionsLabels;
  authLabels: AuthLabels;
}) {
  return (
    <QueryProvider>
      <ReactionsBar slug={slug} labels={labels} authLabels={authLabels} />
    </QueryProvider>
  );
}
