import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactionType, ReactionsResponse } from "@/types/api";
import { apiJson } from "@/lib/http";
import { queryKeys } from "./keys";

/**
 * 查询指定文章的互动统计与当前用户的选中态。
 * `slug` 为空时禁用查询，避免请求无效路径。
 */
export function useReactions(slug: string) {
  return useQuery({
    queryKey: queryKeys.reactions(slug),
    queryFn: () => apiJson<ReactionsResponse>(`/api/reactions/${slug}`),
    enabled: slug.length > 0,
  });
}

/**
 * 切换互动状态，采用乐观更新。
 * - onMutate：立即写入预期的新状态，并快照旧状态
 * - onError：回滚到快照
 * - onSettled：以服务端响应体为准，否则重新请求
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
