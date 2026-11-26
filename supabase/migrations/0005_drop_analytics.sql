-- 0005_drop_analytics.sql — 删除整套统计 schema
-- 应用方式：Supabase Dashboard → SQL Editor
-- 幂等：可重复执行。自移除 /api/analytics/*、web-vitals 依赖与客户端采集脚本后，
-- 已无生产代码写入这些表。

-- 先删视图（视图依赖表）
drop view if exists public.stats_30d_daily;
drop view if exists public.stats_30d_top_posts;
drop view if exists public.stats_30d_vitals;

-- 长期聚合表与原始事件表
drop table if exists public.stats_daily;
drop table if exists public.stats_daily_visitors;
drop table if exists public.stats_post_daily;
drop table if exists public.stats_vitals_daily;
drop table if exists public.page_view_events;
drop table if exists public.web_vital_events;

-- 函数：删除前必须先向 public 回收执行权限（仅靠 cascade 虽可行，
-- 但显式回收才能维持项目「PUBLIC 默认权限应当收窄」的约定）
revoke execute on function public.cleanup_analytics_events() from public;
revoke execute on function public.ingest_pageview(date,text,text,text,text,text,text) from public;
revoke execute on function public.ingest_web_vital(date,text,text,double precision,text,text,text) from public;

-- bump_daily_uv 上挂着 trigger on_new_daily_visitor；CASCADE 会一起带掉 trigger。
drop function if exists public.bump_daily_uv() cascade;
drop function if exists public.cleanup_analytics_events();
drop function if exists public.ingest_pageview(
  date, text, text, text, text, text, text
);
drop function if exists public.ingest_web_vital(
  date, text, text, double precision, text, text, text
);
