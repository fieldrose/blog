# Proposal: MDX 双框架 Demo 与跨框架状态

## Why

简历叙事的核心亮点是「Astro Islands 同站整合 React 19 + Vue 3，并展示两种跨框架协作机制」。目前站点虽已同时挂载两套框架，但没有一篇可运行、可对照的演示文章证明：(1) React 与 Vue 岛屿能同页共存；(2) 两套框架可以通过 nanostores 共享 UI 状态；(3) react-query 与 vue-query 通过同一单例 QueryClient 对相同查询键去重。本变更新增一篇示例 MDX 文章与配套组件/接口，把这些能力变成读者可点击验证的实物。

## What changes

- 新增依赖：`nanostores`、`@nanostores/react`、`@nanostores/vue`。
- 新增 `src/stores/demo.ts`：nanostores atom `counterAtom`（模块级单例，框架无关）。
- 新增 `src/components/react/CounterDemo.tsx` 与 `src/components/vue/CounterDemo.vue`：两个岛屿读写同一个 atom，任一框架 +1/重置，另一框架实时响应。
- 新增只读 BFF `GET /api/reactions/totals`（静态路由，优先于 `[...slug]` 全匹配）：从 `reaction_totals` 视图聚合全站四种反应总数，公开可访问，短缓存头；未配置 Supabase 时返回 503。
- 新增 `src/components/react/ReactionTotalsDemo.tsx`（react-query）与 `src/components/vue/ReactionTotalsDemo.vue`（vue-query）：两者用完全相同的查询键 `queryKeys.reactionTotals()`（`["reactions","totals"]`）请求同一端点；同页同时挂载时网络面板只有一条请求，证明跨框架缓存共享。
- 新增示例文章 `src/content/posts/examples/framework-islands.mdx`：讲解 Islands 架构，内含 React 计数、Vue 计数、nanostores 共享计数、TanStack 跨框架总数四组可运行 Demo（组件均 `client:visible`）。
- i18n 不变（文章为英文技术内容，与现有 docs 类文章一致；组件无硬编码中文文案，标签由文章内文本说明，组件内置最小英文 aria-label）。

## Non-goals

- 不做跨框架路由级状态同步（仅演示同页岛屿）。
- 不引入 Redux/Pinia 之外的其他状态库。
- 不新增统计仪表盘（属步骤 8）。

## Impact

- 新增 1 个公开只读 API；反应数据为全站聚合总数，不含任何用户信息，视图本身已 grant anon。
- Demo 组件在示例文章页才加载 JS，不影响其他页面。
- 文章为 draft 之外的正常发布文章，会出现在文章列表（tag: `docs` 或新 tag `demo`）。
