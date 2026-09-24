import { useQuery } from "@tanstack/react-query";
import type { AnalyticsSummaryResponse } from "@/types/api";
import { apiJson } from "@/lib/http";
import { queryKeys } from "./keys";

export function useStatsSummary() {
  return useQuery({
    queryKey: queryKeys.statsSummary(),
    queryFn: () => apiJson<AnalyticsSummaryResponse>("/api/analytics/summary"),
    // Matches the endpoint's `cache-control: public, max-age=30`.
    staleTime: 30_000,
  });
}
