-- 0003_analytics.sql — privacy-friendly, self-hosted analytics
-- Apply with: supabase db push  (or paste into the Supabase SQL editor)
-- Idempotent: safe to re-run.
--
-- Model: raw events are kept 7 days for troubleshooting only; every
-- accepted event also feeds long-lived, fully aggregated tables that
-- survive raw deletion. Raw tables expose NO row-level access to anon.

-- ─────────────────────────────────────────────────────────────
-- Raw events (service-role writes only; no RLS policy = deny all)
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

-- No policies at all: RLS denies every role except the bypassing service role.
revoke all on public.page_view_events from anon, authenticated;
revoke all on public.web_vital_events from anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Long-lived aggregates
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

-- uv rises only when a genuinely new (day, visitor_hash) row is inserted;
-- ON CONFLICT DO NOTHING skips the trigger for repeat visitors.
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

-- Trigger-only helper; never callable directly. (Both the PUBLIC default and
-- Supabase's per-role default function grants must be revoked.)
revoke execute on function public.bump_daily_uv() from public;
revoke execute on function public.bump_daily_uv() from anon, authenticated;

-- Aggregate tables are also locked down directly; access goes through the
-- SECURITY DEFINER views below (which never select visitor_hash).
alter table public.stats_daily enable row level security;
alter table public.stats_daily_visitors enable row level security;
alter table public.stats_post_daily enable row level security;
alter table public.stats_vitals_daily enable row level security;
revoke all on public.stats_daily from anon, authenticated;
revoke all on public.stats_daily_visitors from anon, authenticated;
revoke all on public.stats_post_daily from anon, authenticated;
revoke all on public.stats_vitals_daily from anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 30-day read-only views for the public dashboard
-- ─────────────────────────────────────────────────────────────
create or replace view public.stats_30d_daily
with (security_invoker = off)
as
  select day, pv, uv
  from public.stats_daily
  where day > current_date - interval '30 days'
  order by day;

-- Merge the /zh|/en locale prefix so one post counts once across locales,
-- and only expose article paths (drops home/list/noise).
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

-- New relations inherit broad default privileges in this project; revoke
-- everything first so the dashboard views are strictly read-only even though
-- they run as the view owner (security_invoker = off).
revoke all on public.stats_30d_daily from anon, authenticated;
revoke all on public.stats_30d_top_posts from anon, authenticated;
revoke all on public.stats_30d_vitals from anon, authenticated;
grant select on public.stats_30d_daily to anon, authenticated;
grant select on public.stats_30d_top_posts to anon, authenticated;
grant select on public.stats_30d_vitals to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Atomic ingestion RPCs (one round trip; increments stay correct
-- under concurrent writes). service_role only.
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

  -- Must follow stats_daily insert: the uv trigger updates the existing day row.
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

-- Functions are executable by PUBLIC by default; revoke that first (revoking
-- anon/authenticated alone is insufficient — they inherit PUBLIC), then
-- re-grant only to service_role.
revoke execute on function public.ingest_pageview(date,text,text,text,text,text,text) from public;
revoke execute on function public.ingest_web_vital(date,text,text,double precision,text,text,text) from public;
revoke execute on function public.ingest_pageview(date,text,text,text,text,text,text) from anon, authenticated;
revoke execute on function public.ingest_web_vital(date,text,text,double precision,text,text,text) from anon, authenticated;
grant execute on function public.ingest_pageview(date,text,text,text,text,text,text) to service_role;
grant execute on function public.ingest_web_vital(date,text,text,double precision,text,text,text) to service_role;

-- ─────────────────────────────────────────────────────────────
-- Opportunistic retention: delete raw rows older than 7 days.
-- Called (low probability) from the collect endpoint; no cron add-on
-- dependency. Aggregate tables are untouched.
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
