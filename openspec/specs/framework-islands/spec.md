# framework-islands Specification

## Purpose
在一篇 MDX 示例文章中同时运行 React 19 与 Vue 3 Astro Islands，演示跨框架共享客户端瞬时状态（nanostores）与服务端状态（React/Vue 共享同一个 TanStack QueryClient 单例、同键去重），并提供无身份要求的全站反应总数只读端点作为真实数据源。

## Requirements

### Requirement: 全站反应总数只读接口

站点 MUST 提供 `GET /api/reactions/totals`（静态路由，不被 `[...slug]` 捕获），从 `public.reaction_totals` 视图读取四种反应的全站总数，返回 `{ "totals": { "like": number, "fire": number, "idea": number, "question": number } }`，缺失的反应类型 MUST 以 0 填充。响应 MUST 带 `cache-control: public, max-age=30`。未配置 Supabase 环境变量时 MUST 返回 503 `SUPABASE_NOT_CONFIGURED`；该端点 MUST NOT 要求任何身份凭据。

#### Scenario: 首次访问返回零填充总数

- **GIVEN** Supabase 已配置但 reactions 表无任何数据
- **WHEN** 匿名请求 `GET /api/reactions/totals`
- **THEN** 返回 200，body 为 `{"totals":{"like":0,"fire":0,"idea":0,"question":0}}`，且含 `cache-control: public, max-age=30`

#### Scenario: 未配置环境变量

- **GIVEN** `PUBLIC_SUPABASE_URL` / anon key 缺失
- **WHEN** 请求该端点
- **THEN** 返回 503，错误码为 `SUPABASE_NOT_CONFIGURED`

### Requirement: nanostores 跨框架共享计数

`src/stores/demo.ts` MUST 导出框架无关的模块级 atom `counterAtom`（初始 0）与 `increment` / `reset` 动作。`CounterDemo.tsx`（React，经 `@nanostores/react` 的 `useStore`）与 `CounterDemo.vue`（Vue，经 `@nanostores/vue` 的 `useStore`）MUST 读写同一个 atom 实例：在任一框架岛屿点击 +1 后，另一框架岛屿显示的计数 MUST 同步更新；重置按钮 MUST 把计数恢复为 0。

#### Scenario: React 与 Vue 计数实时同步

- **GIVEN** 示例文章页同时挂载 React 与 Vue 两个 CounterDemo
- **WHEN** 在 React 版点击 +1 两次
- **THEN** Vue 版显示的计数立即变为 2，且不发生任何网络请求

### Requirement: TanStack Query 跨框架去重演示

`ReactionTotalsDemo.tsx` 与 `ReactionTotalsDemo.vue` MUST 都通过 TanStack Query（react-query / vue-query）以 `queryKeys.reactionTotals()`（即 `["reactions","totals"]`）为键请求 `GET /api/reactions/totals`。两组件同页同时挂载时，浏览器 Network 面板中对该端点 MUST 只出现一次请求（同例上下文内去重）；两者渲染出的四个总数 MUST 完全一致。请求失败（含 503）时 MUST 静默降级为简短的不可用提示，不抛未捕获异常。

#### Scenario: 同键只发一次请求

- **GIVEN** 示例文章页同时挂载 React 与 Vue 两个 totals demo
- **WHEN** 页面加载、两个岛屿同时水合发起查询
- **THEN** Network 面板中 `/api/reactions/totals` 仅出现 1 条请求，两个组件显示相同的总数

### Requirement: 示例 MDX 文章

MUST 存在 `src/content/posts/examples/framework-islands.mdx`，正文中 MUST 依次包含：React 单框架计数 Demo、Vue 单框架计数 Demo、二者共享同一 nanostores atom 的说明与可交互验证、两个 totals Demo 并排展示；所有岛屿 MUST 使用 `client:visible`。文章 MUST 可通过 `/zh/posts/examples/framework-islands/` 与 `/en/posts/examples/framework-islands/` 访问（遵循内容集合现有单语发布约定，两 locale 均可渲染同一内容）。

#### Scenario: 文章与岛屿可访问

- **GIVEN** 执行 `astro build`
- **WHEN** 请求 `/zh/posts/examples/framework-islands/`
- **THEN** 返回 200，HTML 中含 4 个岛屿占位（2 个计数 + 2 个 totals）
