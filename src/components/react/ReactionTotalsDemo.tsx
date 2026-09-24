import { useQuery } from "@tanstack/react-query";
import QueryProvider from "@/lib/query/QueryProvider";
import { queryKeys } from "@/lib/query/keys";
import { apiJson, ApiRequestError } from "@/lib/http";
import {
  REACTION_TYPES,
  type ReactionTotalsResponse,
  type ReactionType,
} from "@/types/api";

const EMOJI: Record<ReactionType, string> = {
  like: "\u{1F44D}",
  fire: "\u{1F525}",
  idea: "\u{1F4A1}",
  question: "\u2753",
};

function TotalsInner() {
  const { data, isError, error } = useQuery({
    queryKey: queryKeys.reactionTotals(),
    queryFn: () => apiJson<ReactionTotalsResponse>("/api/reactions/totals"),
    staleTime: 30_000,
  });

  const unavailable =
    isError &&
    error instanceof ApiRequestError &&
    (error.status === 503 || error.status === 404);

  return (
    <div className="border-border my-4 rounded-lg border p-4">
      <p className="mb-3 text-sm">
        <span className="bg-muted rounded px-2 py-0.5 text-xs">
          React 19 · react-query
        </span>
      </p>
      {unavailable ? (
        <p className="text-muted-foreground text-sm">Totals unavailable.</p>
      ) : (
        <ul className="flex gap-4 text-sm">
          {REACTION_TYPES.map(type => (
            <li key={type}>
              {EMOJI[type]} {data?.totals[type] ?? 0}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Demonstrates cross-framework TanStack cache sharing: this React island and the
 * Vue ReactionTotalsDemo use the identical query key, so only one network
 * request is made when both hydrate on the same page.
 */
export default function ReactionTotalsDemo() {
  return (
    <QueryProvider>
      <TotalsInner />
    </QueryProvider>
  );
}
