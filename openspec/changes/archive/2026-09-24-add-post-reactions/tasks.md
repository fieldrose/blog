# Tasks: 文章表情反馈数据层与 BFF

## 1. 数据库迁移

- [x] 1.1 编写 `supabase/migrations/0001_init.sql`：profiles + 建用户触发器、reactions 表/CHECK/两互斥唯一索引、RLS 策略、`reaction_counts` 与 `reaction_totals` SECURITY DEFINER 视图（执行方式写在 SQL 文件头注释）
- [x] 1.2 在可用的 Supabase 项目执行迁移并验证 RLS（anon 写被拒、计数视图可读）；E2E 追加 `0002_reactions_plain_unique.sql`：部分唯一索引无法被 PostgREST `on_conflict` 命中（42P10），改为普通唯一索引（NULL 本就互异，语义等价）

## 2. 共享契约与服务端工具

- [x] 2.1 `src/types/api.ts`：reaction 枚举、GET/POST/DELETE 请求响应类型与错误契约
- [x] 2.2 `src/lib/server/posts.ts`：已发布文章 slug 白名单（getCollection 派生，实例内缓存）
- [x] 2.3 `src/lib/server/rateLimit.ts`：实例级固定窗口限频
- [x] 2.4 `src/lib/server/http.ts`：结构化 JSON 错误响应辅助
- [x] 2.5 `src/lib/server/auth.ts`：Bearer 鉴权（有效/缺失/无效三态）+ 日盐 IP 哈希 key；`src/lib/server/reactionValidation.ts`：Zod 入参契约；`src/lib/supabase/anon.ts`：服务端无状态只读客户端

## 3. BFF 路由

- [x] 3.1 `src/pages/api/reactions/[...slug].ts` GET（视图计数 + 双身份 selected）
- [x] 3.2 POST（Zod 校验 → JWT/匿名分流 → 唯一索引幂等 upsert → 限频）
- [x] 3.3 DELETE（取消；本人 RLS / 匿名按 client_id）
- [x] 3.4 无 Supabase 配置时 503 结构化降级（dev 实测 404/503/400 路径全部符合）

## 4. 验证

- [x] 4.1 `pnpm astro check`、`pnpm lint`、`pnpm astro build` 通过；页面仍全静态，API 进 SSR Function
- [x] 4.2 `openspec validate add-post-reactions --strict` 通过
- [x] 4.3 真实 Supabase 环境联调（2026-09-24）：GET 登录/匿名双身份、匿名投/取消（UI）、登录投/取消（UI）、非法 body 400、缺 client_id 400、伪造 slug 404、anon 直写被 RLS 拒（401）、totals 真实读数；429 由实例限流器代码保证（未实际刷量触发）。另修两处：POST 匿名 client_id 改为与 GET/DELETE 一致从 `x-client-id` 头读取；文章页传给岛屿的 slug 去掉前导斜杠（避免 `/api/reactions//...`）

## 5. TanStack 请求层与 React 岛屿（步骤 4）

- [x] 5.1 `src/lib/query/keys.ts` 集中查询键；`src/lib/clientId.ts` 匿名设备 UUID
- [x] 5.2 `src/lib/http.ts` 同源 fetch 收敛（自动注入 x-client-id 与 Supabase Bearer、结构化错误）
- [x] 5.3 `QueryProvider.tsx` 注入共享单例；`useReactions.ts` useQuery + useMutation（乐观更新/回滚/服务端为准）
- [x] 5.4 `PostReactions.tsx`（React 19，client:visible，a11y aria-pressed，503/404 安静降级）
- [x] 5.5 文章页标签区下注入，feature flag + 环境变量双门控；zh/en 文案齐备
- [x] 5.6 双构建验证门控（无 env 无岛屿 / 有 env 输出 astro-island）；浏览器实测水合渲染 4 个中文按钮
- [x] 5.7 真实 Supabase 端到端联调（与 4.3 同次完成）

> 步骤 5 认证完成后做登录态投票贯通验证，然后 archive 本变更（reactions 规格已含前端需求）。
