import { QueryClient } from "@tanstack/vue-query";

/**
 * Module-singleton QueryClient shared by BOTH the React and Vue islands.
 *
 * react-query and vue-query are thin adapters over query-core, so injecting
 * the same instance lets two frameworks on one page share one cache:
 * identical query keys are deduplicated to a single network request.
 *
 * We must use vue-query's QueryClient subclass (not the plain query-core
 * class): vue-query's useBaseQuery only subscribes its observer when the
 * client exposes the Vue ref `isRestoring`. The subclass extends the core
 * QueryClient, so react-query accepts it unchanged.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
