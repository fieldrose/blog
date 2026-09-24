import type { App } from "vue";
import { createPinia } from "pinia";
import { VueQueryPlugin } from "@tanstack/vue-query";
import { queryClient } from "@/lib/query/client";
import { readingPersistPlugin } from "@/stores/reading";

/**
 * Vue app entrypoint invoked by @astrojs/vue for EVERY Vue island root.
 * Each island gets its own Vue app instance, so each `createPinia()` below
 * is a separate store container — Vue islands on the same page do NOT share
 * Pinia state. This is intentional for now (only one reading-settings island
 * exists); cross-island shared state would need a module-level singleton pinia.
 */
export default (app: App) => {
  const pinia = createPinia();
  pinia.use(readingPersistPlugin as never);
  app.use(pinia);
  app.use(VueQueryPlugin, { queryClient });
};
