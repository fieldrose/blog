/**
 * Demo metadata loader. Scans all meta.ts files under src/demos/<slug>/.
 * Sorts results by the "order" field in each meta.
 *
 * NOTE: Components (Demo.astro / Demo.tsx / Demo.vue) MUST be statically
 * imported in .astro template files. Astro 7 does NOT support dynamic
 * component rendering via the <component is={...}> pattern.
 * This module only discovers and sorts; actual imports happen in demos/index.astro.
 */
import type { DemoMeta } from "@/types/demo";

export interface DiscoveredDemo {
  slug: string;
  meta: DemoMeta;
}

const metaGlobs = import.meta.glob<{ default: DemoMeta }>(
  "/src/demos/*/meta.ts",
  { eager: true },
);

export function discoverDemos(): DiscoveredDemo[] {
  const entries: DiscoveredDemo[] = Object.entries(metaGlobs).map(
    ([path, mod]) => {
      const slug = path.split("/").slice(-2, -1)[0]!;
      return { slug, meta: mod.default };
    },
  );
  entries.sort((a, b) => a.meta.order - b.meta.order);
  return entries;
}
