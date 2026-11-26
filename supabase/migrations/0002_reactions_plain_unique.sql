-- ─────────────────────────────────────────────────────────────
-- 用普通唯一索引替换原先的部分唯一索引。
--
-- PostgREST 的 upsert 会发送 `on_conflict=post_slug,reaction,user_id`，
-- 而 PostgreSQL 只有在提供 WHERE 谓词时才能把 ON CONFLICT 目标匹配到
-- 部分索引上，supabase-js 的 upsert API 无法做到这一点（错误 42P10）。
--
-- 此处普通 btree 唯一索引等价：PostgreSQL 视 NULL 互不相同，
-- 因此匿名行（user_id / client_id 为 NULL）不会冲突，
-- 与旧的部分索引行为一致。
-- ─────────────────────────────────────────────────────────────

drop index if exists public.reactions_user_uniq;
drop index if exists public.reactions_client_uniq;

create unique index if not exists reactions_user_uniq
  on public.reactions (post_slug, reaction, user_id);

create unique index if not exists reactions_client_uniq
  on public.reactions (post_slug, reaction, client_id);
