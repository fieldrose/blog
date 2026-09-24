# Design: 文章表情反馈数据层与 BFF

## Context

站点页面全部 SSG 预渲染，唯一动态入口是 Netlify Functions（Astro on-demand 路由）。Supabase 提供 Postgres + Auth + RLS。已存在三个 Supabase 客户端模块：浏览器 PKCE 客户端、`asUser`（JWT 透传）、`admin`（service role）。

本设计需要回答三个问题：匿名投票如何在不放开 anon 写权限的前提下落地；计数如何公开读取又不泄露身份；serverless 下如何低成本防刷。

## Goals / Non-goals

- Goals：双身份投票；数据库层强一致；密钥不出函数；slug 伪造防护；无密钥可降级。
- Non-goals：分布式限频、评论/回复、反应类型后台可配（本期固定四枚举）。

## Decisions

### 1. 匿名写入：BFF 持 service role，anon 直写全拒

`reactions` 启用 RLS 后只放策略：public SELECT、`user_id = auth.uid()` 的 INSERT/DELETE。不存在针对 anon 的写策略 → 持 anon key 直连写库一律被拒。

匿名投票只能由 `POST /api/reactions/[slug]` 经 `getAdminSupabase()`（service role，绕过 RLS）写入。函数必须自己承担本应在策略层的约束：

- Zod 校验 `client_id`（UUID v4 字符串，由浏览器首次访问生成并存 localStorage）。
- slug 必须在构建期已发布文章集合内。
- 部分唯一索引兜底重复写入（`onConflict: "do nothing"` 实现幂等）。

### 2. 聚合读取：SECURITY DEFINER 视图

`reaction_counts` 定义为 `SELECT post_slug, reaction, count(*) FROM reactions GROUP BY 1,2` 的视图，owner 为表主函数以 definer 权限执行，授予 anon/authenticated SELECT。视图只暴露三列，物理上不可能泄露身份。`reaction_totals` 额外提供全站合计（供后续跨框架缓存 Demo 使用）。

BFF 的 GET 直接查视图拿计数，再分别按 user_id / client_id 查 `reactions` 得到 selected。

### 3. profiles 触发器建档

`handle_new_user()` 返回 `NEW` 的触发器（`AFTER INSERT ON auth.users`）写入 `profiles(id, username)`。username 取邮箱前缀并做去重兜底（冲突时追加随机后缀），避免注册流程依赖应用层顺序。

### 4. BFF 入参契约与白名单

- 共享类型放 `src/types/api.ts`，与 Zod schema 共置（`reactionSchema`、`getReactionsResponseSchema` 等），前端岛屿（步骤 4）复用同一类型。
- slug 白名单：`src/lib/server/posts.ts` 通过 `getCollection("posts")` 返回已发布且非草稿的 slug 集合；函数冷启动读取，未命中返回 404。

### 5. 限频：实例级滑动窗口（best-effort）

`src/lib/server/rateLimit.ts` 维护进程内 Map：key = 日盐 IP 哈希（或 client_id），窗口 60s、阈值 30 次写。Netlify 多实例下不保证全局一致——明确接受：真正的「一人一票」一致性由两个部分唯一索引保证，限频只负责增加刷量成本。IP 仅参与哈希不入库、不回传。

### 6. 错误契约

统一 JSON：`{ error: { code: "SUPABASE_NOT_CONFIGURED" | "VALIDATION_ERROR" | "POST_NOT_FOUND" | "RATE_LIMITED" | "UNAUTHORIZED", message } }`，HTTP 状态分别 503/400/404/429/401。

## Migration / Rollout

1. Supabase 项目（云端 dev 或本地 CLI）执行 `supabase/migrations/0001_init.sql`。
2. 配置三个环境变量后部署函数。
3. 用 anon key 直连执行写操作做安全验证（必须被 RLS 拒绝）。
4. 回滚：`DROP TABLE reactions, reaction_counts, reaction_totals, profiles CASCADE;`（函数同步下线）。

## Risks

- **service role 误用**：仅 admin 模块接触它，ESLint 已禁止该模块被 API 目录外导入；上线前 grep 构建产物。
- **serverless 冷启动读全量文章白名单**：文章量级为博客级（数百以内），集合读取为静态数据导入，开销可忽略。
- **匿名伪造 client_id**：只能投出一票/设备/反应类型，无收益；不收集 IP 原文，隐私优先。

## 真机联调踩坑（2026-09-24）

1. **部分唯一索引 vs PostgREST upsert（42P10）**：0001 的 `reactions_user_uniq/reactions_client_uniq` 带 `WHERE ... IS NOT NULL`，PostgREST 无法把 `on_conflict=post_slug,reaction,user_id` 匹配到部分索引（缺谓词），supabase-js upsert 无法传谓词 → 写票全部 500。0002 迁移改为普通唯一索引：PostgreSQL 唯一索引中 NULL 互异，匿名行（另一侧为 NULL）天然不冲突，语义与部分索引等价。
2. **POST 匿名身份读取位置不一致**：GET/DELETE 从 `x-client-id` 头取设备 id，POST 却从 body 取，导致 UI（apiFetch 只发头）匿名投票必然 400。已统一为 `readClientId(request)`。
3. **slug 前导斜杠**：文章页把路由用的 `getPostSlug()`（`/examples/x`）直接传给岛屿，请求拼成 `/api/reactions//examples/x`；岛屿 prop 改用无前导斜杠的 `getPostSlugPath()`。
