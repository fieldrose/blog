# Tasks: 隐私友好统计闭环

## 1. 数据库

- [x] 1.1 `supabase/migrations/0003_analytics.sql`：两明细表 + 四聚合表（含 UV 去重表与触发器）+ 三 30 天视图（SECURITY DEFINER 授 anon）+ 7 天清理函数；收回明细表 anon 权限
- [x] 1.2 推送远端并 psql 验证表/视图/触发器/权限

## 2. BFF

- [x] 2.1 服务端工具：日盐访客哈希、path/referrer 归一化
- [x] 2.2 `src/pages/api/analytics/collect.ts`：Zod 判别联合、202/400/429/503、service role 明细写 + 聚合 upsert + 机会式清理
- [x] 2.3 `src/pages/api/analytics/summary.ts`：30 天序列/热门/Vitals/反应总数，30s 缓存，无 env 503

## 3. 浏览器 SDK

- [x] 3.1 `pnpm add web-vitals`；`src/lib/analytics.ts`（beacon/keepalive、静默失败、字段归一化）
- [x] 3.2 `src/lib/web-vitals.ts`（确定性 25% 采样、LCP/CLS/INP）
- [x] 3.3 Layout 挂载：首屏 + `astro:page-load`，feature flag + env 双门控

## 4. 统计页

- [x] 4.1 `StatsDashboard.tsx`：react-query + loading/error/空态，手写 SVG 折线/条形
- [x] 4.2 `_shared/stats/index.astro` + zh/en 薄包装；i18n 文案三处同步；feature flag
- [x] 4.3 footer 或合适入口加链接（zh/en）

## 5. 验证

- [x] 5.1 check / lint / build；双构建门控
- [x] 5.2 真机联调：pageview 落库与聚合、vitals 上报、非法 body 400、匿名无直读权限、summary 数值正确
- [x] 5.3 浏览器验证 stats 页图表/空态/中英双语
- [x] 5.4 `openspec validate add-analytics --strict`
