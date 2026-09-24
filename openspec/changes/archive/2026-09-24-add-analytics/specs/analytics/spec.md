# analytics Delta Specification

## ADDED Requirements

### Requirement: 采集端点校验与响应

站点 MUST 提供 `POST /api/analytics/collect`（`prerender=false`），接受两类 JSON 负载：`pageview`（含 `path`、`locale`、`viewport`、`uaClass`，可选 `referrer`）与 `web-vital`（含 `path`、`metric`、`value`、`rating`、`id`）。服务端 MUST 用 Zod 判别联合校验：`path` MUST 为站内绝对路径且长度受限，`metric` MUST 为 `lcp|cls|inp` 之一，`rating` MUST 为 `good|needs-improvement|poor` 之一。合法请求 MUST 返回 202；校验失败 MUST 返回 400 `VALIDATION_ERROR`；Supabase 未配置时 MUST 返回 503 `SUPABASE_NOT_CONFIGURED`。同一访客哈希每分钟超过 120 次写时 MUST 返回 429 `RATE_LIMITED`。

#### Scenario: 合法 pageview 被接受

- **GIVEN** Supabase 已配置且请求体为合法 pageview
- **WHEN** 客户端 POST `/api/analytics/collect`
- **THEN** 响应状态为 202，且明细与聚合表完成写入

#### Scenario: 非法路径被拒

- **GIVEN** 请求体中 `path` 为 `https://evil.example/x` 等站外绝对 URL
- **WHEN** POST `/api/analytics/collect`
- **THEN** 响应为 400 `VALIDATION_ERROR`，且数据库无写入

#### Scenario: 未配置环境变量时降级

- **GIVEN** Supabase 环境变量缺失
- **WHEN** POST `/api/analytics/collect`
- **THEN** 响应为 503 `SUPABASE_NOT_CONFIGURED`

### Requirement: 隐私优先的访客标识

服务端 MUST 以「服务端密钥 + UTC 日期 + 请求 IP + 请求体中的 `clientId`」的 SHA-256 哈希作为访客标识，且 MUST NOT 存储 IP 原文、cookie 或浏览器指纹（`clientId` 放请求体而非自定义头，因为 `sendBeacon` 无法设置自定义头）。referrer MUST 仅保留来源 host 与路径并去除查询串。聚合表 MUST 只包含计数与哈希，明细行 MUST 可被整体删除而不影响长期聚合。

#### Scenario: 同一访客同日同标识跨日变化

- **GIVEN** 同一 IP 与 client_id 连续两天上报
- **WHEN** 比较两天的 visitor_hash
- **THEN** 哈希值不同（日期盐参与计算），无法跨天关联

### Requirement: 明细短期保留与长期聚合

数据库 MUST 包含 `page_view_events` 与 `web_vital_events` 明细表，以及 `stats_daily`（日 PV/UV）、`stats_daily_visitors`（日-访客去重）、`stats_post_daily`（日-路径浏览量）、`stats_vitals_daily`（日-指标-评级计数）聚合表。UV MUST 通过 `stats_daily_visitors` 的唯一约束与 AFTER INSERT 触发器自增。每次合法 pageview MUST 原子地递增日 PV、日-路径计数（upsert），每次合法 web-vital MUST 递增对应日-指标-评级计数。系统 MUST 提供删除 7 天前明细的 SQL 函数，采集端点 MUST 以低概率机会式调用它。

#### Scenario: 同日同访客多次访问 UV 不重复

- **GIVEN** 某 visitor_hash 在同一天有三次 pageview
- **WHEN** 三次写入完成
- **THEN** `stats_daily.pv` 增加 3 而 `stats_daily.uv` 仅增加 1

#### Scenario: 明细清理不影响聚合

- **GIVEN** 8 天前的明细行与对应日聚合均存在
- **WHEN** 执行清理函数删除 7 天前明细
- **THEN** 明细被删除而 `stats_daily` 等聚合行保持不变

### Requirement: RLS 与读写权限

两张明细表 MUST 仅允许 service role 写入，anon 角色 MUST NOT 拥有明细表的 SELECT/INSERT/UPDATE/DELETE 权限。聚合结果 MUST 通过 SECURITY DEFINER 视图对 anon 开放只读，视图定义 MUST 限定近 30 天窗口，且 MUST NOT 暴露 visitor_hash。

#### Scenario: anon 直写明细被拒

- **GIVEN** 仅携带 anon key 的请求直接 POST `/rest/v1/page_view_events`
- **WHEN** PostgREST 处理该请求
- **THEN** 请求因权限不足失败

### Requirement: 汇总只读端点

站点 MUST 提供 `GET /api/analytics/summary`（`prerender=false`），无需凭据返回近 30 天的日度 PV/UV 序列、热门文章浏览量、Web Vitals 评级计数与四种反应总数。响应 MUST 带 `cache-control: public, max-age=30`。Supabase 未配置时 MUST 返回 503。

#### Scenario: 空数据期返回零值结构

- **GIVEN** Supabase 已配置但近 30 天没有任何事件
- **WHEN** GET `/api/analytics/summary`
- **THEN** 返回 200 与结构完整、计数为 0 的 JSON（数组为空或零填充，形状稳定）

### Requirement: 浏览器采集 SDK

`src/lib/analytics.ts` MUST 在首屏与每次 View Transitions 导航（`astro:page-load`）后上报一次 pageview，优先使用 `navigator.sendBeacon`，不可用时回退 `keepalive` fetch。采集失败（含被广告拦截器阻断）MUST 静默失败且 MUST NOT 影响页面交互。上报字段 MUST 仅包含 path、归一化 referrer、locale、视口档位（四档枚举）与 UA 大类（mobile/tablet/desktop）。采集 MUST 同时受 `features.analytics` 开关与 Supabase 公开环境变量门控。

#### Scenario: Beacon 被拦截时页面无异常

- **GIVEN** 浏览器环境中 sendBeacon 与 fetch 到采集端点均抛错
- **WHEN** 页面加载完成
- **THEN** 不产生未捕获异常，页面功能不受影响

### Requirement: Web Vitals 采样与上报

`src/lib/web-vitals.ts` MUST 使用 `web-vitals` v4 采集 LCP、CLS、INP；采样 MUST 由 client_id 哈希确定性决定（同一访客始终在或不在样本中），采样率 MUST 为 25%。指标值确定时 MUST 经同一个采集端点以 `web-vital` 类型上报。

#### Scenario: 确定性采样

- **GIVEN** 某 client_id 两次加载页面
- **WHEN** 模块两次计算采样判定
- **THEN** 结果一致（同 ID 永远入选或永远不入选），入选概率约为 25%

### Requirement: 统计页与 SVG 仪表盘

站点 MUST 提供 `src/pages/_shared/stats/index.astro` 与 `/zh/stats`、`/en/stats` 薄包装路由，页面 MUST 挂载 React 岛屿 `StatsDashboard`，由 TanStack Query 请求 summary 端点并具备 loading 与 error 态。图表 MUST 为手写 SVG（折线与条形）且 MUST NOT 引入图表库依赖；无数据时 MUST 显示空态文案。所有界面文案 MUST 同时存在于 zh/en 语言包与 `UIStrings` 类型中。

#### Scenario: 无数据时显示空态

- **GIVEN** summary 返回全零结构
- **WHEN** 访客打开 `/zh/stats`
- **THEN** 页面展示本地化空态文案而非破损图表或报错
