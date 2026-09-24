# Proposal: 隐私友好的自建统计闭环

## Why

简历叙事需要「不依赖第三方、隐私友好」的真实数据能力：页面访问与 Web Vitals 由自有 BFF 落库，明细短期保留、长期只存脱敏聚合，再用一个零图表依赖的 React 岛屿把数据画出来。第三方统计（Google Analytics 等）需要 cookie 同意横幅且泄露访客数据给外部，自建方案天然规避，同时展示 Postgres 聚合设计、速率限制与 SVG 可视化能力。

## What Changes

- 新增迁移 `0003_analytics.sql`：明细两张表（`page_view_events` / `web_vital_events`，7 天后由机会式清理函数删除）、长期聚合表（日 PV/UV、日-路径 PV、日-指标-评级计数）、UV 自增触发器、30 天窗口只读视图（SECURITY DEFINER，授予 anon）。
- `POST /api/analytics/collect`：Zod 校验、仅接受同源路径、日盐 IP+client_id 哈希做访客标识（不存原文）、实例限频、service role 写库与聚合 upsert；无 env 时 503。
- `GET /api/analytics/summary`：公开只读，返回近 30 天 PV/UV 序列、热门文章、Web Vitals 评级分布、反应总数（复用 `reaction_totals`），30s 公共缓存。
- 浏览器 SDK `src/lib/analytics.ts`（pageview：path/referrer/locale/视口档位/UA 大类，`sendBeacon`，静默失败）与 `src/lib/web-vitals.ts`（web-vitals v4 采 LCP/CLS/INP，按 client_id 确定性采样 25%，`visibilitychange=hidden` 上报）。
- Layout 挂载采集脚本（`features.analytics` + env 双门控，View Transitions 后监听 `astro:page-load`）。
- React 岛屿 `StatsDashboard.tsx`（react-query 取数、loading/error 态、手写 SVG 折线/条形图）+ `/zh/stats`、`/en/stats` 薄包装页，zh/en 文案齐备。

## Out of Scope

- 实时大屏、会话回放、漏斗、UTM 营销归因。
- pg_cron 定时任务（免费层级不保证）；明细清理走采集端点的机会式触发。
- 后台鉴权：summary 仅暴露脱敏聚合，任何登录态都不返回明细。
