# Proposal: 文章表情反馈（数据层 + BFF）

## Why

博客目前是纯静态站点，读者无法对文章表达反馈，作者也看不到内容受欢迎程度。我们要在不牺牲静态预渲染架构的前提下，引入第一个真实动态能力：文章页的表情反应（👍🔥💡❓）与真实计数。

本变更是该能力的**后端部分**（Postgres schema + RLS + Netlify Functions BFF）；React 岛屿前端在后续变更 `add-reactions-island`（步骤 4）落地，认证闭环在 `add-auth`（步骤 5）落地。后端先行可以让前端先以匿名路径联调，并在简历上完整呈现「BFF + Zod 校验 + JWT 透传 + RLS 行级安全」的数据层设计。

## What changes

- 新增 Supabase 迁移 `supabase/migrations/0001_init.sql`：
  - `profiles` 表 + `auth.users` 插入后自动建档的触发器（为步骤 5 认证准备）。
  - `reactions` 表：登录用户按 `user_id`、匿名设备按 `client_id`，两类互斥唯一索引保证同一身份对同一文章每类反应至多一行。
  - RLS：计数公开可读；登录用户仅能写 `user_id = auth.uid()` 的行；**anon 角色在数据库层被完全禁止写入**（匿名投票只能走 service role 的 BFF）。
  - `reaction_counts` / `reaction_totals` 聚合视图（`SECURITY DEFINER`，只暴露计数不暴露身份列）。
- 新增 BFF 路由 `src/pages/api/reactions/[slug].ts`（`prerender = false`）：
  - `GET`：返回四类反应计数，以及调用方（登录用户或匿名 `client_id`）的已选状态。
  - `POST` / `DELETE`：投票 / 取消；Zod 校验 reaction 枚举、`client_id` 格式；slug 必须命中构建期已发布文章白名单。
  - 有 Bearer token 时构造用户态 Supabase 客户端（JWT 透传，RLS 以用户身份生效）；匿名走 admin（service role）客户端 + 应用层去重。
  - 基础内存限频（best-effort，serverless 实例级）。
  - 未配置 Supabase 环境变量时返回 503 与结构化错误体。
- 新增共享类型 `src/types/api.ts`（请求/响应契约，前后端复用）。

## Non-goals

- 不做前端组件（步骤 4）。
- 不做注册/登录/OAuth（步骤 5）；本变更只保证表与策略为认证就绪。
- 不做反应总数对外的公开统计页（步骤 8 analytics）。
- 不做跨实例分布式限频（serverless 多实例下仅 best-effort；强约束由数据库唯一索引 + RLS 兜底）。
- 不在本迁移创建 analytics / pgvector 表（各自随对应变更出独立迁移文件）。

## Impact

- 新增依赖：`zod`（已安装）。
- 需要在 Supabase 项目执行一次迁移 SQL（本地 CLI 或云端 SQL editor）。
- API 路由作为 Netlify Function 按需执行；页面仍全部预渲染。
- 密钥边界：`SUPABASE_SERVICE_ROLE_KEY` 仅在本 API 路由通过 `src/lib/supabase/admin.ts` 使用，ESLint 导入限制已就位。
