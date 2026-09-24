-- ─────────────────────────────────────────────────────────────
-- Replace the PARTIAL unique indexes with plain ones.
--
-- PostgREST upsert sends `on_conflict=post_slug,reaction,user_id`,
-- and PostgreSQL cannot match an ON CONFLICT target to a partial
-- index unless its WHERE predicate is supplied — the supabase-js
-- upsert API has no way to do that (error 42P10).
--
-- A plain btree unique index is equivalent here: PostgreSQL treats
-- NULLs as distinct, so anonymous rows (NULL user_id / client_id)
-- never collide, exactly like the old partial indexes.
-- ─────────────────────────────────────────────────────────────

drop index if exists public.reactions_user_uniq;
drop index if exists public.reactions_client_uniq;

create unique index if not exists reactions_user_uniq
  on public.reactions (post_slug, reaction, user_id);

create unique index if not exists reactions_client_uniq
  on public.reactions (post_slug, reaction, client_id);
