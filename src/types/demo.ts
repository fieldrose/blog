/**
 * Demo 自描述元数据。每个 src/demos/<slug>/meta.ts 必须默认导出 DemoMeta 对象。
 *
 * framework 决定渲染方式：
 *   astro  → 纯 SSR，<Demo />
 *   react  → island，<Demo client:visible />
 *   vue    → island，<Demo client:visible />
 *   native → 原生片段，直接输出 src/demos/<slug>/Demo.html，不使用岛
 *
 * native 约定：
 *   - 唯一入口是 Demo.html，自包含标记、样式与脚本，不经过任何框架组件
 *   - 需要随客户端路由重复执行的脚本，自行加上 data-astro-rerun 属性
 *   - 类名建议带 demo 前缀，避免与站点全局样式冲突
 *
 * 注：组件必须在 .astro 模板里静态 import（Astro 7 限制），
 *      所以这里不再携带 Component 字段，只负责发现 + 排序。
 */
export type DemoFramework = "astro" | "react" | "vue" | "native";

export interface DemoMeta {
  /** 越小越靠前；缺省排最后 */
  order: number;
  framework: DemoFramework;
  /** 页面标题：框架从这里按当前 locale 取 */
  title: { zh: string; en: string };
  /** 页面描述：同上 */
  description: { zh: string; en: string };
}
