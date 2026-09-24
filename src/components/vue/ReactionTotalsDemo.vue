<script setup lang="ts">
import { computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { queryKeys } from "@/lib/query/keys";
import { apiJson, ApiRequestError } from "@/lib/http";
import {
  REACTION_TYPES,
  type ReactionTotalsResponse,
  type ReactionType,
} from "@/types/api";

// VueQueryPlugin (with the shared singleton QueryClient) is installed globally
// in src/pages/_app.ts, so no local provider is needed here.
const { data, isError, error } = useQuery({
  queryKey: queryKeys.reactionTotals(),
  queryFn: () => apiJson<ReactionTotalsResponse>("/api/reactions/totals"),
  staleTime: 30_000,
});

const emoji: Record<ReactionType, string> = {
  like: "\u{1F44D}",
  fire: "\u{1F525}",
  idea: "\u{1F4A1}",
  question: "\u2753",
};

const rows = computed(() =>
  REACTION_TYPES.map(type => ({ type, emoji: emoji[type] }))
);

const unavailable = computed(
  () =>
    isError.value &&
    error.value instanceof ApiRequestError &&
    (error.value.status === 503 || error.value.status === 404)
);
</script>

<template>
  <div class="border-border my-4 rounded-lg border p-4">
    <p class="mb-3 text-sm">
      <span class="bg-muted rounded px-2 py-0.5 text-xs">
        Vue 3 · vue-query
      </span>
    </p>
    <p v-if="unavailable" class="text-muted-foreground text-sm">
      Totals unavailable.
    </p>
    <ul v-else class="flex gap-4 text-sm">
      <li v-for="row in rows" :key="row.type">
        {{ row.emoji }} {{ data?.totals[row.type] ?? 0 }}
      </li>
    </ul>
  </div>
</template>
