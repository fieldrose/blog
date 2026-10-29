-- 0004_auth_only_reactions.sql — drop anonymous reactions
-- Apply with: Supabase Dashboard → SQL Editor
-- Idempotent: safe to re-run.

-- Remove anonymous path: drop client_id column, CHECK constraint, unique index.
-- The upsert now targets (post_slug, reaction, user_id) only.

-- 1. Drop the mutual-exclusion CHECK constraint (user_id OR client_id)
alter table public.reactions drop constraint if exists reactions_identity_kind;

-- 2. Drop the anonymous unique index
drop index if exists public.reactions_client_uniq;

-- 3. Remove client_id from the model (and any existing anon rows they hold)
--    If client_id has real data you want to preserve, do NOT run this —
--    archive those rows first. We expect none here.
alter table public.reactions drop column if exists client_id;

-- 4. The plain unique index on (post_slug, reaction, user_id) already exists
--    (from 0002_reactions_plain_unique.sql). Nothing to rebuild.

-- 5. RLS grant: anon has no write. Already true — this is defensive.
revoke insert, update, delete on public.reactions from anon;
-- authenticated writes are kept (service_role API still bypasses RLS).

-- 6. Reaction totals view drops to only user rows (no-op, the view already
--    counts the whole reactions table; client_id rows are gone so the totals
--    match counts by signed-in users only).
