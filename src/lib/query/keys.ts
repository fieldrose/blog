/**
 * Centralized TanStack Query keys.
 * React (react-query) and Vue (vue-query) islands import from here so that
 * invalidation and cross-framework cache dedup always agree on the key shape.
 */
export const queryKeys = {
  authUser: () => ["auth", "user"] as const,
  reactions: (slug: string) => ["reactions", slug] as const,
  reactionTotals: () => ["reactions", "totals"] as const,
  statsSummary: () => ["stats", "summary"] as const,
  relatedPosts: (slug: string) => ["ai", "related", slug] as const,
};
