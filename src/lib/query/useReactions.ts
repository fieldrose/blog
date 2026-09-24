import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactionType, ReactionsResponse } from "@/types/api";
import { apiJson } from "@/lib/http";
import { queryKeys } from "./keys";

export function useReactions(slug: string) {
  return useQuery({
    queryKey: queryKeys.reactions(slug),
    queryFn: () => apiJson<ReactionsResponse>(`/api/reactions/${slug}`),
    enabled: slug.length > 0,
  });
}

/**
 * Toggle a reaction with an optimistic update.
 * - onMutate: apply the expected next state immediately and snapshot the old one
 * - onError: roll back to the snapshot
 * - onSettled: trust server state (response body), otherwise refetch
 */
export function useToggleReaction(slug: string) {
  const queryClient = useQueryClient();
  const key = queryKeys.reactions(slug);

  return useMutation({
    mutationFn: ({
      reaction,
      active,
    }: {
      reaction: ReactionType;
      active: boolean;
    }) => {
      if (active) {
        return apiJson<ReactionsResponse>(
          `/api/reactions/${slug}?reaction=${reaction}`,
          { method: "DELETE" }
        );
      }
      return apiJson<ReactionsResponse>(`/api/reactions/${slug}`, {
        method: "POST",
        body: JSON.stringify({ reaction }),
      });
    },

    onMutate: async ({ reaction, active }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ReactionsResponse>(key);

      queryClient.setQueryData<ReactionsResponse>(key, current => {
        const base = current ?? {
          counts: { like: 0, fire: 0, idea: 0, question: 0 },
          selected: [],
        };
        const selected = active
          ? base.selected.filter(item => item !== reaction)
          : [...base.selected, reaction];
        return {
          counts: {
            ...base.counts,
            [reaction]: Math.max(0, base.counts[reaction] + (active ? -1 : 1)),
          },
          selected,
        };
      });

      return { previous };
    },

    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },

    onSettled: data => {
      if (data) {
        queryClient.setQueryData(key, data);
      } else {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}
