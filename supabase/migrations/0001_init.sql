-- 0001_init.sql — profiles 与文章互动
-- 应用方式：supabase db push（或粘贴到 Supabase SQL 编辑器执行）
-- 幂等：可重复执行。

-- ─────────────────────────────────────────────────────────────
-- profiles：与 auth.users 一一对应，注册时自动创建
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles are publicly readable" on public.profiles;
create policy "profiles are publicly readable"
  on public.profiles for select
  using (true);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- anon/authenticated 没有 INSERT 策略：数据行只由下方触发器写入。
grant select on public.profiles to anon, authenticated;
grant update (username) on public.profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_name text;
  candidate text;
  suffix int := 0;
begin
  base_name := coalesce(
    nullif(regexp_replace(split_part(coalesce(new.email, ''), '@', 1), '\s+', '', 'g'), ''),
    replace(new.id::text, '-', '')
  );
  candidate := base_name;
  while exists (select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := base_name || suffix::text;
  end loop;

  insert into public.profiles (id, username)
  values (new.id, candidate)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- reactions：每个身份、每篇文章、每种互动类型仅允许一票
-- ─────────────────────────────────────────────────────────────
create table if not exists public.reactions (
  id          bigint generated always as identity primary key,
  post_slug   text not null,
  reaction    text not null,
  user_id     uuid references auth.users (id) on delete cascade,
  client_id   text,
  created_at  timestamptz not null default now(),

  -- 每行要么是登录用户投票，要么是匿名设备投票，二者不可兼得。
  constraint reactions_identity_kind check (
    (user_id is not null and client_id is null)
    or
    (user_id is null and client_id is not null)
  ),
  constraint reactions_reaction_check
    check (reaction in ('like', 'fire', 'idea', 'question'))
);

-- 互斥约束：同一身份不能对同一类型重复投票。
create unique index if not exists reactions_user_uniq
  on public.reactions (post_slug, reaction, user_id)
  where user_id is not null;

create unique index if not exists reactions_client_uniq
  on public.reactions (post_slug, reaction, client_id)
  where client_id is not null;

create index if not exists reactions_post_idx
  on public.reactions (post_slug);

alter table public.reactions enable row level security;

-- 公开读取……
drop policy if exists "reactions are publicly readable" on public.reactions;
create policy "reactions are publicly readable"
  on public.reactions for select
  using (true);

-- ……登录用户只能写入自己的记录……
drop policy if exists "users insert own reactions" on public.reactions;
create policy "users insert own reactions"
  on public.reactions for insert
  with check (user_id = auth.uid());

drop policy if exists "users delete own reactions" on public.reactions;
create policy "users delete own reactions"
  on public.reactions for delete
  using (user_id = auth.uid());

-- 显式授权：anon 仅可读（anon 没有 INSERT/UPDATE/DELETE 策略，
-- 且无论授权如何，RLS 默认拒绝）。
grant select on public.reactions to anon, authenticated;
grant insert, delete on public.reactions to authenticated;
revoke insert, update, delete on public.reactions from anon;

-- ─────────────────────────────────────────────────────────────
-- 聚合视图：只暴露计数，不含身份列
-- ─────────────────────────────────────────────────────────────
create or replace view public.reaction_counts
with (security_invoker = off)
as
  select post_slug,
         reaction,
         count(*)::int as count
  from public.reactions
  group by post_slug, reaction;

create or replace view public.reaction_totals
with (security_invoker = off)
as
  select reaction,
         count(*)::int as count
  from public.reactions
  group by reaction;

grant select on public.reaction_counts to anon, authenticated;
grant select on public.reaction_totals to anon, authenticated;
