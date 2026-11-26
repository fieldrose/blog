-- 0004_auth_only_reactions.sql — 移除匿名互动
-- 应用方式：Supabase Dashboard → SQL Editor
-- 幂等：可重复执行。

-- 移除匿名路径：删除 client_id 列、CHECK 约束与唯一索引。
-- upsert 此后仅作用于 (post_slug, reaction, user_id)。

-- 1. 删除互斥 CHECK 约束（user_id 或 client_id 二选一）
alter table public.reactions drop constraint if exists reactions_identity_kind;

-- 2. 删除匿名唯一索引
drop index if exists public.reactions_client_uniq;

-- 3. 从模型中移除 client_id（连同其持有的匿名行）
--    若 client_id 中确有需要保留的数据，请勿执行本节——
--    先归档这些行。此处预期不存在此类数据。
alter table public.reactions drop column if exists client_id;

-- 4. (post_slug, reaction, user_id) 上的普通唯一索引已存在
--    （见 0002_reactions_plain_unique.sql），无需重建。

-- 5. RLS 授权：anon 无写入权限。当前已如此，此处为防御性加固。
revoke insert, update, delete on public.reactions from anon;
-- authenticated 的写入权限保留（service_role API 仍然绕过 RLS）。

-- 6. 互动总数视图收敛为仅统计登录用户行（等价操作：视图本就统计整张
--    reactions 表，client_id 行删除后，总数即等同于登录用户的计数）。
