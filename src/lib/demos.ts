/**
 * demo 元数据加载器：扫描 src/demos/<slug>/ 下的全部 meta.ts，
 * 并按各 meta 的 order 字段排序。
 *
 * 注意：组件（Demo.astro / Demo.tsx / Demo.vue）必须在 .astro 模板中静态导入。
 * Astro 7 不支持通过 <component is={...}> 模式动态渲染组件。
 * 本模块只负责发现与排序，实际导入发生在 demos/index.astro。
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

/** 返回按 order 升序排列的 demo 列表（slug 取自目录名）。 */
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
