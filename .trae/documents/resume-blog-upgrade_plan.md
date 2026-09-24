# 简历级个人技术博客升级实施计划

## 一、目标与定位

在现有 AstroPaper（Astro 7.3 + Vue 集成已装但未使用）基础上，把博客升级为可在简历中呈现的个人项目，核心叙事：

> **基于 Astro Islands 架构，在同一个预渲染博客中同时整合 React 19 与 Vue 3 两套框架；以 Serverless API（BFF）+ Supabase（Postgres / Auth / RLS / pgvector）补齐动态能力（登录注册、文章反馈、RAG 智能问答、隐私统计、性能监控），配合 PWA 离线、自动化测试/CI，并以 OpenSpec 规格驱动流程组织全部 AI 辅助开发。**

### 已确认的范围决策

| 决策项 | 选择 |
|---|---|
| 整体架构 | 静态 SSG + Serverless BFF（页面全部预渲染，仅 API 路由按需执行） |
| 数据与身份 | **Supabase**：Postgres 表 + RLS 策略 + Supabase Auth（邮箱/密码 + GitHub OAuth） |
| React 承载（React 19） | 登录注册用户菜单、文章互动反馈区（表情反应，真实计数）、统计仪表盘 |
| Vue 承载 | 阅读设置面板（Pinia + 偏好持久化） |
| 请求状态管理 | **TanStack Query v5**（react-query + vue-query 双适配器，单例 QueryClient） |
| 双框架协作展示 | MDX 文章内嵌 React/Vue 可运行 Demo + 跨框架共享状态 |
| AI 集成 | 基于 Supabase pgvector 的 RAG 文章问答（流式回答 + 引用溯源）+ 语义检索 |
| 工程方法论 | **OpenSpec 规格驱动开发**：每个变更先有 proposal/delta spec/design/tasks，再由 AI 实施、归档沉淀 |
| 额外亮点 | PWA、Vitest/Playwright 测试、Web Vitals 监控 + Lighthouse CI、自建无 cookie 统计 |
| 部署 | Netlify（Functions）+ Supabase 云服务；Supabase/AI 全部配置走环境变量 |

## 二、仓库调研结论

**已有可复用基础：**
- Astro 7.3 + `@astrojs/vue@7` + `vue@3.5` 已安装；MDX 8 已启用，可直接在 `.mdx` 中嵌入框架组件。
- Tailwind v4 CSS-first 主题（`data-theme` 属性暗色方案）、Shiki 双主题、i18n（zh/en，`_shared` 逻辑 + 语言薄包装）、Pagefind、satori OG 图、RSS/sitemap/JSON-LD 均完备。
- `ClientRouter`（View Transitions）全局启用，脚本均按 `astro:after-swap` 重绑——新岛屿需遵循同一生命周期。
- 已有 Astro 环境变量校验先例：`astro.config.ts` 中 `env.schema` 使用 `envField`（可扩展 Supabase 变量）。
- CI（lint/format/build）、Docker、netlify.toml 已存在。

**必须先修的现存问题：**
1. `astro-paper.config.ts` 的 `site.url` 是 Netlify 预览长链接（且具体到某文章），`site.title` 为空，`site.lang` 为 `"en"` 而默认 locale 是 `zh`，timezone 为 `Asia/Bangkok`。会污染 sitemap/RSS/canonical/OG。
2. Vue 集成已启用但零使用；React 集成未安装。
3. `netlify.toml` 用 `npm run build`，但仓库锁文件是 pnpm（CI 也用 pnpm），需统一。
4. 构建脚本 `cp -r dist/pagefind public/` 会在源码目录生成产物，加 adapter 后需确认函数构建与该步骤顺序不受影响。

**关键版本事实（2026-09 核实）：**
- `@astrojs/react@5.0.7` 支持 Astro 6/7，搭配 **React 19**；`@astrojs/netlify@8` 为 Astro 7 对应适配器。
- Astro 7 使用 Vite 8（Rolldown），部分 Vite 插件存在兼容性风险（见风险节）。
- 安装 adapter 后 Astro 默认仍预渲染所有页面，仅显式 `export const prerender = false` 的 API 路由变为函数，静态产物形态不变。
- Supabase 官方 JS 客户端 `@supabase/supabase-js` v2 同时覆盖 Auth（PKCE）、PostgREST、Realtime；RLS 为数据库层强制策略。

## 三、目标架构

```
浏览器（预渲染 HTML + 零 JS 默认）
 ├─ React 19 岛屿：AuthDialog/UserMenu、PostReactions（client:visible）、StatsDashboard、AiAssistant
 ├─ Vue 3 岛屿：ReadingSettings（Pinia，client:idle）
 ├─ MDX 内 React/Vue Demo（nanostores 跨框架 UI 状态）
 ├─ 服务端状态层：TanStack Query v5（react-query + vue-query 共用单例 QueryClient）
 ├─ Supabase Auth：supabase-js 客户端（PKCE 会话、GitHub OAuth）
 ├─ 原生脚本：analytics SDK（beacon）/ web-vitals / SW 注册
 └─ Service Worker：预缓存 + SWR（页面）/ cache-first（字体图片）
        │ fetch（同源、Bearer Token、网络优先禁缓存）/ sendBeacon / SSE 流式
        ▼
Netlify Functions（Astro 按需 API，BFF：Zod 校验 + 限频 + 密钥隔离）
 ├─ /api/reactions/[slug]   GET 计数 / POST·DELETE 投票（转发用户 JWT）
 ├─ /api/ai/chat            RAG 问答（SSE 流式；向量检索→上下文拼装→模型代理）
 ├─ /api/ai/related/[slug]  文章向量相似推荐
 └─ /api/analytics/*        collect 上报（service role）/ summary 聚合
        ▼
Supabase（Postgres + RLS + Auth + pgvector）
 ├─ auth.users / profiles（注册触发器建档）
 ├─ reactions（登录用户按 user_id、匿名按 client_id；RLS 限定本人可写）
 ├─ reaction_counts / reaction_totals（SECURITY DEFINER 视图）
 ├─ post_embeddings（文章分块向量；match_posts RPC 相似度检索；RLS 公开只读）
 └─ analytics_events（仅 service role 可写，明细保留 7 天）
        ▲ 构建/手动脚本 pnpm ai:ingest（分块→embedding→upsert）
大模型：OpenAI 兼容接口（baseURL/模型名走环境变量，可换 DeepSeek/智谱/OpenAI）
本地开发：同一套代码，仅切换 .env 中的 Supabase 与模型配置
```

## 四、文件与模块清单

### 4.1 基建、环境变量与配置

**Supabase 配置全部环境变量化（集中定义，便于切换项目/环境）：**

| 变量 | 可见性 | 用途 |
|---|---|---|
| `PUBLIC_SUPABASE_URL` | 公开 | 浏览器/服务端访问 Supabase 项目地址 |
| `PUBLIC_SUPABASE_ANON_KEY` | 公开 | 匿名/已登录请求的受 RLS 保护密钥 |
| `SUPABASE_SERVICE_ROLE_KEY` | **仅服务端** | 绕过 RLS 的管理密钥，只允许在 API 路由使用 |
| `PUBLIC_SITE_URL` | 公开 | OAuth/邮件回调基址，替代现有硬编码 url |
| `AI_API_BASE_URL` | 仅服务端 | OpenAI 兼容大模型网关地址（可换厂商） |
| `AI_API_KEY` | **仅服务端** | 大模型/embedding 密钥，只允许在 API 路由与入库脚本使用 |
| `AI_CHAT_MODEL` | 仅服务端 | 对话模型名 |
| `AI_EMBEDDING_MODEL` / `AI_EMBEDDING_DIM` | 仅服务端 | 向量模型名与维度（换模型需重新入库） |

落地物：
- `astro.config.ts`：新增 `react()`、`netlify()` adapter；`env.schema` 增加以上全部 `envField`（AI 相关标记 `optional: true`，未配置时功能开关自动关闭，其余缺失即构建报错）；PWA 集成（方案见 4.7）。
- `.env.example`：提交全部变量名与注释（不含值）；`.env.local` 加入 `.gitignore`；Netlify 后台配置生产值。
- `src/lib/supabase/client.ts`：浏览器单例（`createClient`，PKCE，会话存 localStorage）。
- `src/lib/supabase/asUser.ts`：API 路由内按请求 Bearer token 构造"用户态"客户端（透传 Authorization 头，RLS 以该用户身份生效）。
- `src/lib/supabase/admin.ts`：服务端单例（service role），**模块断言只在服务端入口被引用**，禁止进入客户端 bundle。
- `astro-paper.config.ts`：`url` 改读 `PUBLIC_SITE_URL`；修正 `title`、`lang: "zh"`、timezone；新增 features 开关：`auth`、`reactions`、`analytics`、`aiAssistant`、`pwa`。
- `src/types/config.ts` + `src/config.ts`：新开关的类型与默认值。
- `netlify.toml`：build command 改 `pnpm run build`，保留 Node 22。
- `src/i18n/lang/zh.ts`、`en.ts`、`types.ts`：新增登录注册、反馈区、设置面板、统计页全部文案（遵循现有 UIStrings 约定）。

### 4.2 Supabase 数据层

**Schema（`supabase/migrations/0001_init.sql`，可在云端或本地 CLI 重复执行）：**
- `profiles`：`id uuid primary key references auth.users`、`username`、`created_at`；触发器在 `auth.users` 插入时自动建档。
- `reactions`：`post_slug text`、`reaction text check in ('like','fire','idea','question')`、`user_id uuid null`、`client_id text null`、`created_at`；两个互斥唯一索引（登录态 `(post_slug, reaction, user_id)`、匿名态 `(post_slug, reaction, client_id)`），保证同一身份每类反应只有一行。
- RLS 策略：`select` 公开可读；`insert/delete` 仅 `user_id = auth.uid()` 的本人行（匿名写入在数据库层被禁，只能走 service role 的 BFF）。
- `reaction_counts(slug)` 与 `reaction_totals`：`SECURITY DEFINER` 视图/函数聚合计数，授予 anon 只读，**不暴露任何身份列**。
- 开启 `vector` 扩展；`post_embeddings`：`post_slug`、`chunk_index`、`heading`、`content`、`embedding vector(N)`（N 取自 `AI_EMBEDDING_DIM`），按 `(post_slug, chunk_index)` 唯一；IVFFLAT/HNSW 索引；`match_posts(query_embedding, match_count, similarity_threshold)` RPC（SECURITY DEFINER，anon 可执行，返回 slug/标题/片段/相似度）；RLS 公开只读、写入仅 service role。
- `analytics_events`：RLS 对 anon/authenticated 全拒，仅 service role 写入；按天分区或定期清理（7 天）。

**BFF 路由（`src/pages/api/`，均 `export const prerender = false`）：**
- `reactions/[slug].ts`：
  - `GET`：`reaction_counts` 视图取计数 + 该用户/该 client_id 的已选状态；
  - `POST/DELETE`：Zod 校验（slug 必须在构建期文章白名单、reaction 枚举、client_id 格式）；有 Bearer token 走用户态客户端（RLS 兜底），匿名走 admin 客户端 + 应用层 client_id 去重/限频；投票=插入、取消=删除（切换=删旧插新）。
- `ai/chat.ts`：RAG 问答端点。Zod 校验会话（轮数/长度上限）→ 调用 embedding 接口向量化问题 → `match_posts` 取 top-k 片段 → 系统提示词约束"仅依据检索内容回答、必须引用来源"→ 代理对话模型并以 **SSE 流式**返回（文本增量 + 引用条）；未配置 AI 环境变量时返回 503；按日盐 IP 哈希限频。
- `ai/related/[slug].ts`：取当前文章向量做相似检索，返回相关文章（排除自身，短缓存头）。
- `analytics/collect.ts`：仅用 admin 客户端写事件；Zod 校验 + 大小限制；服务端做"日盐 + IP 哈希"，**不存原始 IP、不写 cookie**。
- `analytics/summary.ts`：返回近 30 天公开聚合（PV、日盐 UV、热门文章、反应总数），带短缓存头。
- `src/types/api.ts`：请求/响应共享类型，服务端与客户端岛屿共用。

### 4.2.1 客户端请求层：TanStack Query v5（React + Vue 双适配器）

所有客户端异步状态（查询缓存、乐观更新、失效重取、竞态取消、错误重试）统一交给 TanStack Query，不手写 fetch 状态机：

- `src/lib/query/client.ts`：基于 `@tanstack/query-core` 创建**模块级单例 QueryClient**（`staleTime`、`retry: 1`、`refetchOnWindowFocus: false`），React 与 Vue 岛屿共享同一份缓存——同页两个框架请求同一接口时去重只发一次，这是本项目跨框架协作的关键技术点。
- React 侧：`src/lib/query/QueryProvider.tsx` 用 `@tanstack/react-query` 的 `QueryClientProvider` 包裹岛屿根；开发环境挂载 `@tanstack/react-query-devtools`。
- Vue 侧：通过 `@astrojs/vue` 的 `appEntrypoint`（`src/pages/_app.ts`）安装 `VueQueryPlugin` 并注入同一单例；开发环境接 `@tanstack/vue-query-devtools`。
- 查询键集中管理于 `src/lib/query/keys.ts`（`["auth","user"]`、`["reactions", slug]`、`["stats","summary"]`），保证跨框架失效一致。
- 网络传输收敛在 `src/lib/http.ts`：同源 fetch 封装，自动附带 Supabase 会话 access_token（`onAuthStateChange` 同步）、401 时触发会话刷新、非 2xx 抛错；端点 URL 不散落在组件里。

### 4.3 Supabase Auth 登录注册（React 19）

- `src/components/react/AuthDialog.tsx`：登录/注册双 Tab 弹窗（邮箱+密码，含确认密码、密码强度提示、加载/错误态）；GitHub OAuth 按钮（PKCE，回调地址取 `PUBLIC_SITE_URL`）；无障碍按现有菜单模式（焦点陷阱、Esc 关闭）。
- `src/components/react/UserMenu.tsx`：`client:idle` 挂入 Header——未登录显示入口按钮，已登录显示头像下拉（邮箱、退出）。
- `src/lib/auth/useAuth.ts`：封装 supabase-js `onAuthStateChange`，以 `["auth","user"]` 注入 TanStack Query 缓存；注册成功、登出、token 刷新均驱动全站查询状态；登出时失效 reactions 查询。
- 邮箱注册依赖 Supabase 确认邮件；本地/预览环境可在 Supabase 控制台关闭确认以便测试（环境说明写入 `.env.example` 注释）。
- 注入点：Header.astro 新增岛屿位（zh/en 共用，无需改包装页）。

### 4.4 Vue 3：阅读设置面板
- `src/stores/reading.ts`：Pinia store——字号倍率、行距、内容宽度（枚举档位），持久化插件写 localStorage，重置动作。
- `src/components/vue/ReadingSettings.vue`：齿轮按钮 + 弹出面板（复用 Header 语言菜单的无障碍模式：aria-expanded/outside-click/Esc），`client:idle` 挂载到 Header。
- 设置生效方式：store 变更时写 CSS 变量到 `<html>`（`--reader-font-scale` 等），与现有 `theme.ts` 的暗色模式正交共存；变量在根节点，View Transition 天然保持。
- 该面板为纯本地偏好，无网络请求——状态归 Pinia；凡涉及请求的 Vue 岛屿统一走 `@tanstack/vue-query`（插件已在 app entrypoint 全局装好）。

### 4.5 React 19：文章互动反馈区
- `src/components/react/PostReactions.tsx`：表情反应按钮组（👍🔥💡❓），props 注入 post slug 与 i18n 文案，外层包 `QueryProvider`；已登录用户的投票跨设备跟随账号，匿名投票仅本设备。
- `src/lib/query/useReactions.ts`：
  - `useReactions(slug)`：`useQuery` 拉取计数与已选状态（查询去重、缓存、失败重试由 Query 处理）；
  - `useVoteReaction()`：`useMutation` 投票/取消，`onMutate` 乐观更新并快照、`onError` 回滚、`onSettled` invalidate `["reactions", slug]`。
- 水合策略 `client:visible`（进入视口才加载 React）；错误边界兜底，接口失败时只影响按钮区不影响阅读。
- 注入点：`src/pages/_shared/posts/[...slug]/index.astro`（标签区下方），zh/en 包装页自动继承。

### 4.6 MDX 双框架 Demo + 跨框架状态
- `src/stores/demo.ts`：nanostores atom（共享计数器）。
- `src/components/react/CounterDemo.tsx`（`@nanostores/react`）与 `src/components/vue/CounterDemo.vue`（`@nanostores/vue`）：任一框架操作，另一框架实时响应。
- **TanStack 跨框架请求 Demo**：一对"站点反应总数"小组件——React 版用 `useQuery`、Vue 版用 `useQuery`（vue-query），查询键完全相同（`keys.ts` 统一，读 `reaction_totals`），同页同时挂载时 Network 面板可验证共享单例 QueryClient 的请求去重与缓存复用。
- `src/content/posts/examples/framework-islands.mdx`：讲解 Islands 架构的示例文，内含：React 单框架 Demo、Vue 单框架 Demo、nanostores 共享状态 Demo、TanStack Query 跨框架缓存 Demo，并附各岛屿实际下发 JS 的说明（构建产物对照）。

### 4.7 PWA
- `public/manifest.webmanifest` + 图标（192/512/maskable，复用 sharp 从现有 OG 图生成）。
- 首选 `@vite-pwa/astro`（autoUpdate、injectRegister、runtimeCaching：HTML SWR、图片/字体 cache-first、API 网络仅离线跳过、Pagefind 索引 stale-while-revalidate）。
- **兼容性回退**：若该插件不支持 Vite 8/Rolldown，则手写 `public/sw.js` + 一个约 40 行的 Astro 集成（`astro:build:done` 钩子生成预缓存清单），能力等价。
- Layout 增加 manifest 链接与 SW 注册（监听 `astro:after-swap` 不重复注册）；离线兜底页 `offline.md` 联动。

### 4.8 自建统计 + Web Vitals
- `src/lib/analytics.ts`：无 cookie 埋点 SDK——pageview（path、referrer、locale、视口档位、UA 大类），用 `sendBeacon`，广告拦截时静默失败；不收集任何个人身份信息。
- `src/lib/web-vitals.ts`：`web-vitals` 最新稳定版采集 LCP/CLS/INP，采样率（如 25%），`visibilitychange=hidden` 时上报，与 pageview 同端点不同事件类型。
- `src/components/react/StatsDashboard.tsx`（`useQuery(["stats","summary"])`，含 loading/error 态）+ `src/pages/_shared/stats/index.astro`（+ zh/en 薄包装页）：消费 summary API，**手写 SVG 折线图/条形图（零图表库依赖）** 展示近 30 天 PV/UV、热门文章、反应分布。

### 4.9 AI 集成：RAG 文章问答与语义检索
- `scripts/ai/ingest.ts`（`pnpm ai:ingest`）：读取 Content Layer 全部已发布文章 → 按标题层级分块（带 overlap）→ 调 `AI_EMBEDDING_MODEL` 向量化 → upsert 进 `post_embeddings`；增量逻辑以 `(post_slug, content_hash)` 判断是否需要重算；发文后手动或 CI 手动触发执行。
- `src/server/ai/`：`embeddings.ts`（向量化客户端，OpenAI 兼容协议）、`rag.ts`（检索 + 上下文拼装 + 提示词模板，含"无依据则拒答"约束）、`model.ts`（SSE 流式代理）；全部仅服务端引用，密钥不出函数。
- `src/components/react/AiAssistant.tsx`：右下角悬浮聊天岛屿，`client:idle` 仅在 `features.aiAssistant` 开启时挂载；fetch 读取 SSE 流逐字渲染（`useReducer` 管消息机，不用 TanStack——流式非典型请求状态），`react-markdown` + `remark-gfm` 渲染回复，引用渲染为文章链接卡片；对话历史 localStorage 持久化；支持中断生成、清空会话、中英界面文案；503/限频有明确提示。
- 文章页"相关文章"：`src/lib/query/useRelatedPosts.ts`（`useQuery`，TanStack 管理）+ 小卡片列表，注入 `_shared/posts/[...slug]/index.astro`。
- 安全与边界：密钥只在函数侧；输入长度/轮数 Zod 限制；系统提示词限定只回答博客内容；检索不到时返回固定兜底文案；SW 对 `/api/ai/*` network-only；限频防刷量。

### 4.10 OpenSpec 规格驱动开发工作流
- 初始化：`npx @fission-ai/openspec@latest init`（Node ≥ 20.19，本项目 engines ≥ 22.12 满足），生成 `openspec/specs/`、`openspec/changes/`、`openspec/config.yaml` 及 AI 工具配置。
- **保护现有 AGENTS.md**：init 会写入 OpenSpec 交接段，需与现有 `AGENTS.md`（astro dev 规则等）手动合并，不覆盖。
- 本项目的执行约定：第 3~9 步每个功能阶段开工前，先在 `openspec/changes/<change>/` 产出 `proposal.md`（为什么/范围）、`specs/` delta（ADDED Requirements + GIVEN/WHEN/THEN 场景）、`design.md`（关键技术决策）、`tasks.md`（勾选清单），评审通过后再 `/opsx:apply` 实施，完成后 `/opsx:archive` 合并进 `openspec/specs/`。
- 首批沉淀的能力规格：`auth`、`reactions`、`ai-assistant`、`analytics`、`pwa`、`i18n`、`search-pagefind`（后两个同时对现有行为做反向建档）。
- CI 门禁：ci.yml 增加 `npx @fission-ai/openspec@latest validate --strict`（规格语法/引用校验），PR 必须包含或更新对应 change 产物。
- 简历价值：提交记录中可展示"规格（可评审的需求与验收场景）→ 任务 → 实现 → 归档"的完整 AI 协作链路，而非一次性聊天生成代码。

### 4.11 测试与 CI
- `vitest.config.ts`（happy-dom 环境）：
  - 工具单测：`getSortedPosts`/`postFilter`（草稿、定时发布边界）、`slugify`、`getPostPaths`；
  - RAG 单测：分块算法、提示词拼装、`match_posts` 结果映射、无检索结果兜底、未配置 AI 变量时 503；
  - API 路由测试：mock Supabase 客户端，断言 Zod 校验、JWT 透传/匿名分流、限频、聚合输出；
  - 组件测试：`@testing-library/vue` 测 ReadingSettings（Pinia + 持久化）；`@testing-library/react` 测 AuthDialog、PostReactions、AiAssistant（模拟 SSE 流，断言逐字渲染/中断/错误态；均包测试专用 QueryClient）。
- `playwright.config.ts` + `tests/e2e/`：首页/文章页渲染、zh↔en 切换保持路径、Pagefind 搜索、注册→登录→投票→退出闭环（测试专用 Supabase 账号走环境变量）、匿名投票、阅读设置持久化、AI 问答流式输出与引用跳转（mock 模型或专用低费 key）、**离线模式文章可读（SW）**、统计页渲染。
- `.github/workflows/ci.yml`：新增 `openspec-validate`（`npx @fission-ai/openspec@latest validate --strict`）、`test`（vitest run）、`e2e`（playwright，需先 build 产 pagefind 索引）三个 job；E2E job 注入测试用 Supabase/AI secrets。
- 新增 `.github/workflows/lighthouse.yml`：针对 Netlify Preview Deploy 跑 Lighthouse CI，性能/可访问性/SEO 预算门禁（阈值在首次实测后校准，不拍脑袋写死）。

## 五、实施步骤（依赖顺序）

> 约定：第 3~10 步每个阶段开工前先在 `openspec/changes/` 建变更（proposal/delta spec/design/tasks），实施完成并验证后 archive，规格沉淀到 `openspec/specs/`。

1. **基建修正 + 环境变量骨架**：修正站点配置（url 改读 `PUBLIC_SITE_URL`、title/lang/tz）；统一 netlify.toml 为 pnpm；接入 react/netlify adapter；`env.schema` + `.env.example` + 三个 supabase 客户端模块；Vue 配置 `appEntrypoint` 安装 VueQueryPlugin；验证现有页面全部仍为静态 HTML、缺失必填环境变量时构建按 schema 报错。
2. **OpenSpec 初始化**：`npx @fission-ai/openspec@latest init`，合并（非覆盖）AGENTS.md；补 i18n/search 两个存量能力的反向规格；CI 加 `openspec validate`。
3. **Supabase 数据层**：建项目（云端 dev 或本地 CLI）→ 执行迁移 SQL（含 vector 扩展、表/触发器/RLS/视图/RPC）→ reactions/analytics BFF 路由（JWT 透传 + 匿名 service role 双路径）→ Zod 校验与类型联通。
4. **TanStack 请求层 + React 反馈区**：单例 QueryClient + http（Bearer 注入/401 刷新）+ query keys → useQuery/useMutation hooks（乐观更新/回滚/失效）→ PostReactions 组件 + 文章页注入，先以匿名路径联调。
5. **Supabase Auth**：AuthDialog/UserMenu + useAuth 接入 TanStack 缓存 → 邮箱注册/登录、GitHub OAuth 回调闭环 → 反馈区登录态投票贯通（RLS 本人策略验证）。
6. **Vue 设置面板**：Pinia store + 组件 + Header 挂载 + CSS 变量联动（纯本地状态，不走请求层）。
7. **MDX 双框架 Demo**：nanostores 共享 atom 组件 + TanStack 同键跨框架请求去重 Demo + 示例文章。
8. **统计闭环**：collect/summary（admin 写入/聚合）+ analytics SDK + web-vitals + stats 页面（react-query 取数 + 手写 SVG 图表）。
9. **AI RAG**：迁移向量表/RPC → `pnpm ai:ingest` 全量入库 → chat（SSE）与 related 两个 API → AiAssistant 岛屿与相关文章卡片 → 限频/503/引用跳转验证。
10. **PWA**：manifest/图标 → SW 方案落地（先试官方插件，不通则回退手写）→ 离线验证（SW 对 AI/统计接口 network-only）。
11. **测试体系**：vitest 单测先行补到核心模块（含 RAG/SSE）→ Playwright E2E → CI 接线（含测试账号/AI secrets）。
12. **Lighthouse CI**：接 Preview URL，先跑基线再定预算阈值；回归核对各岛屿水合策略与总包体积。
13. **收尾**：全部 change archive 完成、简历描述措辞定稿、无用依赖检查；README/环境说明仅在用户确认后增补。

## 六、依赖与注意事项

**版本原则：全部取当前主版本最新稳定线。**

**新增 dependencies：** `@astrojs/react@^5`、**`react@^19`**、**`react-dom@^19`**、`@supabase/supabase-js@^2`、`pinia@^3`、`nanostores`、`@nanostores/react`、`@nanostores/vue`、`@tanstack/query-core@^5`、`@tanstack/react-query@^5`、`@tanstack/vue-query@^5`、`@astrojs/netlify@^8`、`react-markdown`（最新稳定线）、`remark-gfm`、`web-vitals@latest`。

**新增 devDependencies：** `vitest` 最新稳定线、`happy-dom`、`@testing-library/react`、`@testing-library/vue`、`@testing-library/jest-dom`、`@playwright/test`、`@tanstack/react-query-devtools`、`@tanstack/vue-query-devtools`、`@lhci/cli`、`tsx`（运行 `scripts/ai/ingest.ts`）、（可能）`@vite-pwa/astro`。

**工具但不进 package.json：** `@fission-ai/openspec` CLI（本地全局安装、CI 走 `npx`）；可选 `supabase` CLI（本地起库）。
**package.json 新增脚本：** `ai:ingest`（tsx 执行入库脚本）。

**注意事项：**
- **密钥边界**：`SUPABASE_SERVICE_ROLE_KEY` 绝不能加 `PUBLIC_` 前缀、绝不被客户端模块引用；admin 客户端文件只允许 `src/pages/api/**` 与 `src/server/**` 导入，加 ESLint 规则限制导入路径。
- React 与 Vue 共存无编译冲突：React 仅在 `.tsx`，Vue 仅在 `.vue`；tsconfig 的 `jsx: preserve` 已满足。
- Vue 侧 TanStack 接入依赖 `@astrojs/vue` 的 `appEntrypoint`（`src/pages/_app.ts` 中 `app.use(VueQueryPlugin, { queryClient })`）；React 侧用组件级 Provider。两侧注入**同一个 query-core 单例**，需在 Astro 多岛屿运行时验证缓存共享（若被拆包则退化为各自实例，功能不受影响，Demo 文案据实表述）。
- RLS 是最后一道防线：即使 BFF 有漏洞，登录用户也无法越权写他人数据；匿名写仅存在于 service role 路径，靠应用层白名单 + 限频约束。
- OAuth/邮件回调必须在 Supabase 控制台按环境登记 `PUBLIC_SITE_URL`（本地、Netlify preview、生产三条）。
- API 路由放在 `src/pages/api/`，不受 zh/en 前缀影响；所有动态接口严禁被 SW 缓存。
- View Transitions 下岛屿随页面切换重挂载：认证态与查询缓存位于模块单例，不随岛屿销毁丢失。
- 本地开发二选一：连接云端 dev 项目（零安装）或 `npx supabase start` 起本地栈；切换只改 `.env.local`，代码零改动。
- AI 模型走 OpenAI 兼容协议（baseURL 可换厂商），不把任何一家 SDK 焊死在代码里；AI 变量全部 optional + feature flag，未配置时站点与构建完全正常，问答岛不渲染、API 返回 503。
- 换 embedding 模型会改变向量维度，必须重跑 `pnpm ai:ingest`（维度与模型名记录在迁移注释/配置中）。
- OpenSpec init 会改写/管理根目录 AGENTS.md，实施时采用手动合并，保留现有 astro dev 等规则。

## 七、验证方式

- 环境准备：`.env.local` 填齐必填变量（AI 变量可选），迁移 SQL 执行成功；故意删必填变量验证 `env.schema` 构建报错；不配 AI 变量时验证功能降级（岛不渲染/API 503）。
- `npx @fission-ai/openspec@latest validate --strict` 通过，`openspec/specs/` 与已实施能力一致。
- `pnpm ai:ingest` 成功写入向量；用 SQL/RPC 验证中英文检索召回。
- `pnpm astro check` 类型通过；`pnpm lint`（含 service key/AI key 导入边界规则）、`format:check` 通过。
- `pnpm build` 后确认：`dist/` 仍产出全部静态 HTML；Netlify Functions 仅含 API；客户端产物中 grep 不到 service role key 与 AI key；pagefind 索引正常。
- Supabase 控制台验证 RLS：用 anon key 直连尝试越权写 `reactions`、读 `analytics_events`、写 `post_embeddings` 必须被拒。
- `pnpm vitest run` 全绿；`pnpm playwright test` 全绿（含注册登录闭环、AI 流式问答、离线用例）。
- 手动：注册/GitHub 登录、投票跨刷新与跨设备持久、匿名投票、退出后态正确、设置面板持久、MDX Demo 双框架联动、AI 问答流式输出且引用可跳转、无关问题被拒答、断网访问已读文章、stats 页出数。
- Netlify Preview Deploy 上 Lighthouse 四科分数与基线对比；确认 sitemap/canonical 域名正确。
- Dev server 按 AGENTS.md 使用 `astro dev --background` 管理。

## 八、风险与对策

1. **RLS 或 service key 配置失误导致越权/泄密**（最高风险）：密钥分级 + ESLint 导入边界 + 构建产物 grep 检查；RLS 策略纳入手动安全验证清单与 E2E 断言；admin 写入仍过 Zod 白名单。
2. **`@vite-pwa/astro` 与 Vite 8/Rolldown 不兼容**：回退手写 SW + `astro:build:done` 生成预缓存清单，功能不缩减。
3. **接 adapter 后误把页面变成按需渲染**：构建产物检查（每页 HTML 存在性）+ E2E 断言；API 路由显式 `prerender=false`，页面不写该指令。
4. **邮件投递/GitHub OAuth 回调配置问题**：登录开发期可在 Supabase 关闭邮箱确认；回调地址三环境登记；E2E 使用专用测试账号 secrets。
5. **接口被刷/恶意写入**：Zod + slug 构建期白名单 + client_id 去重 + 日盐 IP 哈希限频（超限 429）；登录态由 RLS 约束；统计仅为博客级可信度。
6. **双框架增加包体积违背 Astro 性能初衷**：严格水合策略（反馈 `client:visible`、设置与菜单 `client:idle`、Demo 仅示例页加载），Lighthouse 预算门禁 + 构建产物对照写进示例文。
7. **广告拦截器阻断统计端点**：fire-and-forget 静默失败；SW network-only 保证不污染计数。
8. **AI 成本/可用性与提示词注入**：密钥仅服务端、限频与输入长度限制、feature flag 可一键关闭；系统提示词限定"仅依据检索内容回答"，无召回走兜底文案；模型厂商走 OpenAI 兼容 baseURL，故障时可换供应商；E2E 默认 mock SSE，不烧 token。
9. **embedding 维度/召回质量**：维度与模型名纳入配置；换模型强制全量重入库；用中英文样本人工校验 top-k 召回并把阈值写进 RAG 单测。
10. **OpenSpec 形式化拖慢节奏**：规格保持轻量（一个能力一页 spec），只覆盖验收场景不写瀑布文档；init 合并 AGENTS.md 而非覆盖。
11. **CI 时长与外部依赖**：E2E 依赖 Playwright 浏览器缓存 + 与 lint/build 并行 job；Supabase/AI 不可达时测试全 mock，不依赖外网；Lighthouse 仅在 PR 预览环境跑。

## 九、简历呈现映射（事实 + 可度量口径）

| 简历技术点 | 代码事实 | 可补充的量化口径（上线实测后填） |
|---|---|---|
| Astro Islands 多框架共存 | React 19 认证/反馈/AI 助手/统计岛屿 + Vue 3 设置岛屿 + MDX Demo 同站 | Lighthouse 性能分、首屏 JS 体积 |
| 跨框架状态共享 | nanostores 打通 React/Vue UI 状态；Pinia 管理 Vue 偏好；TanStack Query v5 单例 QueryClient 被 react-query/vue-query 共用 | Demo 页各框架 chunk 大小、同键请求去重抓包证据 |
| BFF + Supabase 全栈数据层 | Netlify Functions 做 Zod 校验/限频/JWT 透传；Postgres 表设计、RLS 行级安全、触发器建档、SECURITY DEFINER 聚合视图 | 函数冷响应时间、RLS 策略覆盖率 |
| 完整认证闭环 | Supabase Auth（邮箱注册 + GitHub OAuth、PKCE、会话刷新），登录态/匿名双投票路径 | 第三方登录耗时、注册转化（可选） |
| AI 集成（RAG） | pgvector 向量检索 + 分块入库脚本 + SSE 流式 BFF（密钥隔离/限频/引用溯源/无依据拒答）+ React 聊天岛屿 + 相关文章推荐 | 首 token 延迟、召回命中率（抽样）、模型调用成本 |
| AI 工程化协作 | OpenSpec 规格驱动：proposal/delta spec（GIVEN-WHEN-THEN）/design/tasks/archive 全链路，CI 强制 validate | 规格覆盖能力数、变更平均交付周期 |
| 性能工程 | web-vitals 自研采集 + Lighthouse CI 预算门禁 + SW 离线 | 实测 LCP/CLS/INP、离线可用率 |
| 隐私友好统计 | 无 cookie、日盐哈希、明细 7 天清理、聚合视图脱敏 | 日活/文章热度（真实数据） |
| 配置工程化 | Supabase/AI 全部配置环境变量化（公开/服务端分级、模型厂商可换）+ Astro env schema 构建期校验 + 三环境切换零改码 | — |
| 质量保障 | Vitest（双框架组件 + API/JWT + RAG/SSE 测试）+ Playwright（认证闭环、AI 问答、离线场景） | 用例数、CI 门禁覆盖 |
