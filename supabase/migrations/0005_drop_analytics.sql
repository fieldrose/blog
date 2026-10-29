-- 0005_drop_analytics.sql — drop the whole analytics schema
-- Apply with: Supabase Dashboard → SQL Editor
-- Idempotent: safe to re-run. No production code writes to these tables
-- since we removed /api/analytics/*, the web-vitals dependency and the
-- client-side collection script.

-- Views first (depends on tables)
drop view if exists public.stats_30d_daily;
drop view if exists public.stats_30d_top_posts;
drop view if exists public.stats_30d_vitals;

-- Long-lived aggregates + raw events
drop table if exists public.stats_daily;
drop table if exists public.stats_daily_visitors;
drop table if exists public.stats_post_daily;
drop table if exists public.stats_vitals_daily;
drop table if exists public.page_view_events;
drop table if exists public.web_vital_events;

-- Functions (must revoke from public before drop — cascade alone is fine but
-- explicit revokes keep the project's "PUBLIC default grants = narrow" rule)
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
