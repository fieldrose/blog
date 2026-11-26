/**
 * 集中式 TanStack Query key 定义。
 * React（react-query）与 Vue（vue-query）island 统一从此导入，
 * 确保失效逻辑与跨框架缓存去重始终使用一致的 key 结构。
 */
export const queryKeys = {
  authUser: () => ["auth", "user"] as const,
  reactions: (slug: string) => ["reactions", slug] as const,
  reactionTotals: () => ["reactions", "totals"] as const,
  statsSummary: () => ["stats", "summary"] as const,
  relatedPosts: (slug: string) => ["ai", "related", slug] as const,
};
