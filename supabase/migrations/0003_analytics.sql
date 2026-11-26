-- 0003_analytics.sql — 注重隐私的自托管统计
-- 应用方式：supabase db push（或粘贴到 Supabase SQL 编辑器执行）
-- 幂等：可重复执行。
--
-- 模型：原始事件仅保留 7 天用于排障；每个被接收的事件同时写入长期保留的
-- 全聚合表，聚合数据在原始数据删除后仍然存在。原始表对 anon 不开放任何行级访问。

-- ─────────────────────────────────────────────────────────────
-- 原始事件（仅 service_role 写入；没有 RLS 策略即全部拒绝）
-- ─────────────────────────────────────────────────────────────
create table if not exists public.page_view_events (
  id            bigint generated always as identity primary key,
  ts            timestamptz not null default now(),
  day           date not null default (now() at time zone 'utc')::date,
  path          text not null,
  referrer      text,
  locale        text not null,
  viewport      text not null check (viewport in ('xs','sm','md','lg')),
  ua_class      text not null check (ua_class in ('mobile','tablet','desktop')),
  visitor_hash  text not null
);

create table if not exists public.web_vital_events (
  id            bigint generated always as identity primary key,
  ts            timestamptz not null default now(),
  day           date not null default (now() at time zone 'utc')::date,
  path          text not null,
  metric        text not null check (metric in ('lcp','cls','inp')),
  value         double precision not null,
  rating        text not null check (rating in ('good','needs-improvement','poor')),
  vital_id      text not null,
  visitor_hash  text not null
);

create index if not exists page_view_events_day_idx
  on public.page_view_events (day);
create index if not exists web_vital_events_day_idx
  on public.web_vital_events (day);

alter table public.page_view_events enable row level security;
alter table public.web_vital_events enable row level security;

-- 不设任何策略：除绕过 RLS 的 service_role 外，RLS 拒绝所有角色。
revoke all on public.page_view_events from anon, authenticated;
revoke all on public.web_vital_events from anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 长期保留的聚合表
-- ─────────────────────────────────────────────────────────────
create table if not exists public.stats_daily (
  day  date primary key,
  pv   integer not null default 0,
  uv   integer not null default 0
);

create table if not exists public.stats_daily_visitors (
  day           date not null,
  visitor_hash  text not null,
  primary key (day, visitor_hash)
);

create table if not exists public.stats_post_daily (
  day    date not null,
  path   text not null,
  views  integer not null default 0,
  primary key (day, path)
);

create table if not exists public.stats_vitals_daily (
  day     date not null,
  metric  text not null check (metric in ('lcp','cls','inp')),
  rating  text not null check (rating in ('good','needs-improvement','poor')),
  n       integer not null default 0,
  primary key (day, metric, rating)
);

-- 仅当插入真正的全新 (day, visitor_hash) 行时 uv 才递增；
-- ON CONFLICT DO NOTHING 会让回访用户跳过该触发器。
create or replace function public.bump_daily_uv()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.stats_daily
     set uv = uv + 1
   where day = new.day;
  return new;
end;
$$;

drop trigger if exists on_new_daily_visitor on public.stats_daily_visitors;
create trigger on_new_daily_visitor
  after insert on public.stats_daily_visitors
  for each row execute function public.bump_daily_uv();

-- 仅由触发器调用的辅助函数，不允许直接被调用。（PUBLIC 默认权限与
-- Supabase 的角色级默认函数权限都必须回收。）
revoke execute on function public.bump_daily_uv() from public;
revoke execute on function public.bump_daily_uv() from anon, authenticated;

-- 聚合表本身也直接锁定；访问统一走下方的 SECURITY DEFINER 视图
-- （这些视图从不查询 visitor_hash）。
alter table public.stats_daily enable row level security;
alter table public.stats_daily_visitors enable row level security;
alter table public.stats_post_daily enable row level security;
alter table public.stats_vitals_daily enable row level security;
revoke all on public.stats_daily from anon, authenticated;
revoke all on public.stats_daily_visitors from anon, authenticated;
revoke all on public.stats_post_daily from anon, authenticated;
revoke all on public.stats_vitals_daily from anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 供公开看板使用的 30 天只读视图
-- ─────────────────────────────────────────────────────────────
create or replace view public.stats_30d_daily
with (security_invoker = off)
as
  select day, pv, uv
  from public.stats_daily
  where day > current_date - interval '30 days'
  order by day;

-- 合并 /zh|/en 语言前缀，使同一篇文章跨语言只计一次，
-- 并且只暴露文章路径（过滤首页、列表等噪声）。
create or replace view public.stats_30d_top_posts
with (security_invoker = off)
as
  select regexp_replace(path, '^/(zh|en)(/posts/)', '/posts/') as path,
         sum(views)::int as views
  from public.stats_post_daily
  where day > current_date - interval '30 days'
    and path ~ '^/(zh|en)/posts/'
  group by 1
  order by views desc, path
  limit 15;

create or replace view public.stats_30d_vitals
with (security_invoker = off)
as
  select metric, rating, sum(n)::int as n
  from public.stats_vitals_daily
  where day > current_date - interval '30 days'
  group by metric, rating
  order by metric, rating;

-- 本项目新建对象会继承较宽的默认权限，因此先回收全部权限，
-- 使看板视图即使以视图所有者身份运行（security_invoker = off）也严格只读。
revoke all on public.stats_30d_daily from anon, authenticated;
revoke all on public.stats_30d_top_posts from anon, authenticated;
revoke all on public.stats_30d_vitals from anon, authenticated;
grant select on public.stats_30d_daily to anon, authenticated;
grant select on public.stats_30d_top_posts to anon, authenticated;
grant select on public.stats_30d_vitals to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 原子写入 RPC（单次往返，并发写入下计数仍然正确），仅 service_role 可用。
-- ─────────────────────────────────────────────────────────────
create or replace function public.ingest_pageview(
  p_day date, p_path text, p_referrer text, p_locale text,
  p_viewport text, p_ua_class text, p_visitor_hash text
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.page_view_events
    (day, path, referrer, locale, viewport, ua_class, visitor_hash)
  values (p_day, p_path, p_referrer, p_locale, p_viewport, p_ua_class, p_visitor_hash);

  insert into public.stats_daily (day, pv, uv)
  values (p_day, 1, 0)
  on conflict (day) do update set pv = public.stats_daily.pv + 1;

  -- 必须放在 stats_daily 插入之后：uv 触发器更新的是已存在的日期行。
  insert into public.stats_daily_visitors (day, visitor_hash)
  values (p_day, p_visitor_hash)
  on conflict do nothing;

  insert into public.stats_post_daily (day, path, views)
  values (p_day, p_path, 1)
  on conflict (day, path) do update set views = public.stats_post_daily.views + 1;
$$;

create or replace function public.ingest_web_vital(
  p_day date, p_path text, p_metric text, p_value double precision,
  p_rating text, p_vital_id text, p_visitor_hash text
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.web_vital_events
    (day, path, metric, value, rating, vital_id, visitor_hash)
  values (p_day, p_path, p_metric, p_value, p_rating, p_vital_id, p_visitor_hash);

  insert into public.stats_vitals_daily (day, metric, rating, n)
  values (p_day, p_metric, p_rating, 1)
  on conflict (day, metric, rating) do update
    set n = public.stats_vitals_daily.n + 1;
$$;

-- 函数默认对 PUBLIC 可执行，必须先回收该权限（仅回收 anon/authenticated
-- 不够，它们继承 PUBLIC），再只授权给 service_role。
revoke execute on function public.ingest_pageview(date,text,text,text,text,text,text) from public;
revoke execute on function public.ingest_web_vital(date,text,text,double precision,text,text,text) from public;
revoke execute on function public.ingest_pageview(date,text,text,text,text,text,text) from anon, authenticated;
revoke execute on function public.ingest_web_vital(date,text,text,double precision,text,text,text) from anon, authenticated;
grant execute on function public.ingest_pageview(date,text,text,text,text,text,text) to service_role;
grant execute on function public.ingest_web_vital(date,text,text,double precision,text,text,text) to service_role;

-- ─────────────────────────────────────────────────────────────
-- 机会式清理：删除 7 天前的原始数据行。
-- 由采集端点以较低概率调用，不依赖 cron 扩展；聚合表不受影响。
-- ─────────────────────────────────────────────────────────────
create or replace function public.cleanup_analytics_events()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.page_view_events where day < current_date - 7;
  delete from public.web_vital_events where day < current_date - 7;
$$;

revoke execute on function public.cleanup_analytics_events() from public;
revoke execute on function public.cleanup_analytics_events() from anon, authenticated;
grant execute on function public.cleanup_analytics_events() to service_role;
