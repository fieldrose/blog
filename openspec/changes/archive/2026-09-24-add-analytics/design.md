# Design: 隐私友好统计

## 数据分层：明细 7 天 + 聚合长期

只查明细做排障，仪表盘全部读聚合；明细被清理后聚合仍可无限期保留。

- 明细表
  - `page_view_events(id, ts, day, path, referrer, locale, viewport, ua_class, visitor_hash)`
  - `web_vital_events(id, ts, day, path, metric, value, rating, visitor_hash)`
  - 两表仅 service role 可写；anon 无权读（不存在 RLS 放行策略）。
- 聚合表（service role 写、anon 通过 SECURITY DEFINER 视图读）
  - `stats_daily(day PK, pv, uv)`：pv 在 collect 内 upsert 自增；uv 由 `stats_daily_visitors(day, visitor_hash)` 唯一表 + AFTER INSERT 触发器自增（PostgreSQL 唯一索引中 NULL 不适用，hash 必填）。
  - `stats_post_daily(day, path, views, PK(day,path))`：每次 pageview upsert 自增，支撑热门文章。
  - `stats_vitals_daily(day, metric, rating, n, PK(day,metric,rating))`：vital 上报 upsert 自增。不存精确分位数——30 天 P75 需要 t-digest 类结构，评级（good/needs-improvement/poor）计数对简历展示足够且零依赖。
- 视图：`stats_30d_daily` / `stats_30d_top_posts`（限前 15、过滤 `/` 与列表页噪声保留文章页为主）/ `stats_30d_vitals`，均 `where day > current_date - 30`。
- 清理：`cleanup_analytics_events()` 删除 7 天前明细；collect 端点以 1% 概率在写库后异步调用（`pg_sleep` 不可取——直接执行 DELETE，小表开销极低），不引入外部 cron 依赖。

## 访客标识与隐私

`visitor_hash = sha256("${SERVICE_ROLE_KEY}|${UTC 日期}|${IP ?? 'unknown'}|${body.clientId}")`，日盐哈希（独立工具函数，避免与限频语义耦合）。日更盐使跨天追踪不可行；IP 原文、cookie、指纹一律不存。referrer 仅保留 host + path（去掉 query），长度截断；同源 referrer 归一为空。

## collect 端点

`POST /api/analytics/collect`，两类负载（均带 `clientId: UUID`，因为 `sendBeacon` 不能设置自定义头，访客设备 id 只能放 body）：
- `{type:"pageview", clientId, path, referrer?, locale, viewport, uaClass}`
- `{type:"web-vital", clientId, path, metric, value, rating, id}`

Zod 判别联合；`path` 必须是站内绝对路径（`/` 开头、无 host、白字符、≤200 字符）；`metric ∈ lcp|cls|inp`，`rating ∈ good|needs-improvement|poor`。限频：同 visitor_hash 每分钟 120 次写。合法请求统一 202 Accepted（fire-and-forget 客户端不关心结果）；非法 400；未配置 503。

## 浏览器 SDK

- `analytics.ts`：`trackPageview()` 由 Layout 脚本在 `astro:page-load`（覆盖首屏与 View Transitions）调用；`sendBeacon` 优先，不可用时 `fetch(...,{keepalive:true})`；任何异常吞掉（广告拦截器静默失败）。
- 视口档位：`<480 / <768 / <1024 / ≥1024` 四档；UA 大类只区分 mobile/tablet/desktop（UA-CH 不可用时回退 UA 字符串粗判，结果只有三枚举值）。
- `web-vitals.ts`：采样在模块加载时由 client_id 哈希确定性决定（同一访客始终在/不在样本内，样本 25%）；`web-vitals@6` 的 `onLCP/onCLS/onINP`，`hidden` 时由库内部回调上报，每条 vital 带库给的 `id` 去重（同指标重复回调以最后一次为准——库保证只在值最终确定时发一次）。另尊重 `navigator.doNotTrack === "1"`。

## 仪表盘

`StatsDashboard.tsx` 用共享 QueryClient（自包 QueryProvider）请求 `/api/analytics/summary`；三块手写 SVG/HTML：30 天 PV/UV 折线（30 天零填充、双 polyline + 网格线）、热门文章水平条形、vitals 评级堆叠条；reactions 总数作为四个小数字卡，顶部另放 PV/UV 30 天总量双卡。容器宽度用 ResizeObserver 适配；无数据时显示空态文案而非空图。

## 实现踩坑记录

- **`sendBeacon` 不能设置自定义头**：最初设计与 reactions 一样用 `x-client-id` 携带设备 id，但 beacon 只能用 Blob 决定 Content-Type，故 analytics 的 `clientId` 放请求体（Zod 校验 UUID），规格与类型同步修正。
- **Supabase 默认权限比预期宽**：新建函数默认对 PUBLIC 授 EXECUTE，且本项目还有给 anon/authenticated 的按角色默认权限——只 `revoke ... from anon, authenticated` 不够，必须同时 `revoke ... from public` 再显式 `grant ... to service_role`。新建视图同理：默认继承到 ALL 权限，而 `security_invoker=off` 的简单视图（`stats_30d_daily` 无 GROUP BY，理论上可更新）会以视图 owner 身份绕过 RLS，必须先 `revoke all ... from anon, authenticated` 再 `grant select`。用 `information_schema.routine_privileges` / `role_table_grants` 逐一核验。
- **原子自增 upsert 走 Postgres RPC**：PostgREST upsert 无法表达 `pv = pv + 1`，改为两个 `SECURITY DEFINER` SQL 函数 `ingest_pageview` / `ingest_web_vital`，一次 RPC 完成明细插入 + 全部聚合更新；UV 触发器依赖 `stats_daily` 当日行先存在，函数内插入顺序固定（先 stats_daily 后 visitors）。
- **本地不采集**：Layout 脚本对 localhost/127.0.0.1 直接跳过，避免开发流量污染生产统计；端点级验证改用 curl/节点脚本。
- supabase-js 的 rpc builder 不是完整 Promise 类型（无 `.catch` 类型），机会式清理用 `.then(onOk, onErr)` 悬空调用。
