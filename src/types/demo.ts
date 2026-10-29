/**
 * Demo 自描述元数据。每个 src/demos/<slug>/meta.ts 必须默认导出 DemoMeta 对象。
 *
 * framework 决定渲染方式：
 *   astro  → 纯 SSR，<Demo />
 *   react  → island，<Demo client:visible />
 *   vue    → island，<Demo client:visible />
 *
 * 注：组件必须在 .astro 模板里静态 import（Astro 7 限制），
 *      所以这里不再携带 Component 字段，只负责发现 + 排序。
 */
export type DemoFramework = "astro" | "react" | "vue";

export interface DemoMeta {
  /** 越小越靠前；缺省排最后 */
  order: number;
  framework: DemoFramework;
  /** 页面标题：框架从这里按当前 locale 取 */
  title: { zh: string; en: string };
  /** 页面描述：同上 */
  description: { zh: string; en: string };
}
