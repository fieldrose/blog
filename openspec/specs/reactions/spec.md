# reactions Specification

## Purpose
让读者无需评论系统即可对已发布文章给出四类表情反馈（👍 like / 🔥 fire / 💡 idea / ❓ question）。计数对所有人公开；登录用户的投票绑定账号（RLS 本人可写），匿名投票绑定设备标识且只能经由服务端 BFF 写入。

## Requirements

### Requirement: 反应数据模型与身份互斥

系统 MUST 在 Postgres 中维护 `reactions` 表，每行包含 `post_slug`、`reaction`（受 CHECK 约束限定为 `like|fire|idea|question`）、可空的 `user_id` 与可空的 `client_id`、`created_at`。登录态行 MUST 满足 `user_id IS NOT NULL AND client_id IS NULL`，匿名态行 MUST 满足 `client_id IS NOT NULL AND user_id IS NULL`；数据库 MUST 通过互斥的部分唯一索引保证「同一身份对同一文章的同一反应至多一行」。

#### Scenario: 登录用户重复投票被数据库拒绝

- **GIVEN** 用户 `u1` 已对文章 `p1` 投了 `like`
- **WHEN** 再次插入 `(p1, like, user_id=u1)`
- **THEN** 数据库唯一索引拒绝重复行

#### Scenario: 同一匿名设备重复投票被拒绝

- **GIVEN** 匿名设备 `c1` 已对文章 `p1` 投了 `fire`
- **WHEN** 再次插入 `(p1, fire, client_id=c1)`
- **THEN** 数据库唯一索引拒绝重复行

#### Scenario: 非法 reaction 值被拒绝

- **WHEN** 写入 `reaction = 'love'`
- **THEN** CHECK 约束拒绝该行

### Requirement: profiles 随注册自动建档

系统 MUST 在 `auth.users` 插入新用户时，通过触发器在 `profiles` 表自动创建同 id 的档案行；`profiles` 与 `auth.users` 为 1:1 主键外键关系。

#### Scenario: 新注册用户自动有 profile

- **WHEN** Supabase Auth 创建一个新用户
- **THEN** `profiles` 中出现同 `id` 的行，无需应用层额外写入

### Requirement: RLS 安全边界

系统 MUST 启用行级安全并满足：`reactions` 对所有人公开 SELECT；已登录用户仅能 INSERT/DELETE 自己 `user_id = auth.uid()` 的行；anon 角色 MUST NOT 直接 INSERT/UPDATE/DELETE 任何行（匿名写入只允许由持 service role 的 BFF 完成）。`profiles` 公开可读、用户仅能更新自己的行。

#### Scenario: anon 直连写库被拒

- **GIVEN** 攻击者持有公开 anon key
- **WHEN** 直接对 `reactions` 发起 INSERT/DELETE
- **THEN** Postgres RLS 拒绝操作

#### Scenario: 用户不能删除他人投票

- **GIVEN** 用户 `u2` 尝试删除 `u1` 的反应行
- **WHEN** 发起 DELETE
- **THEN** RLS 策略不匹配该行，删除数量为 0

#### Scenario: 计数读取不暴露身份

- **WHEN** 任意访客读取聚合视图 `reaction_counts`
- **THEN** 只能看到 `post_slug / reaction / count`，视图中不存在 user_id、client_id 列

### Requirement: 计数与已选状态查询 API

BFF MUST 提供 `GET /api/reactions/[slug]`，返回四类反应的计数，以及依据请求身份（Bearer 用户 JWT，或 `x-client-id` 头）计算出的已选集合；响应 MUST 遵循 `src/types/api.ts` 的共享契约。slug 不属于构建期已发布文章白名单时 SHALL 返回 404。

#### Scenario: 匿名访客获取计数

- **WHEN** 匿名带 `x-client-id: c1` 请求某文章的反应状态
- **THEN** 返回 `{ counts: {like, fire, idea, question}, selected: [...] }`，selected 只包含 c1 投过的类型

#### Scenario: 未发布或伪造 slug

- **WHEN** 请求 `/api/reactions/not-a-real-post`
- **THEN** 返回 404，不查询聚合数据

### Requirement: 投票与取消 API（双身份路径）

BFF MUST 提供 `POST /api/reactions/[slug]`（body: `{ reaction, client_id? }`）与 `DELETE /api/reactions/[slug]`（query/body 指定 reaction），并在写入前用 Zod 校验全部入参（reaction 枚举、`client_id` 长度与字符集）。携带有效用户 JWT 时 MUST 使用用户态客户端（JWT 透传）并忽略 client_id；无 JWT 时 MUST 使用 service role 客户端写入匿名行。重复投票 SHALL 幂等成功（冲突视为已投）。

#### Scenario: 登录用户投票走 RLS 身份

- **GIVEN** 请求带有效 Bearer token
- **WHEN** POST 一个反应
- **THEN** 写入行带该用户 user_id、不带 client_id，且由 RLS 授权

#### Scenario: 匿名投票只被 BFF 接受

- **GIVEN** 请求无 Bearer，带合法 `client_id`
- **WHEN** POST 一个反应
- **THEN** BFF 经 service role 写入匿名行；任何人无法用 anon key 复刻该写入

#### Scenario: 非法请求体被拒

- **WHEN** POST body 缺少 reaction 或 client_id 含非法字符
- **THEN** 返回 400 与结构化错误信息，不产生任何写入

### Requirement: 未配置时优雅降级与限频

当 Supabase 必需环境变量缺失时，反应 API MUST 返回 503 结构化响应而非进程崩溃。API MUST 对写入端点施加实例级基础限频（如同一身份/IP 短时间超过阈值返回 429）；限频为 best-effort，最终一致性约束由数据库唯一索引保证。

#### Scenario: 缺密钥环境

- **GIVEN** 部署环境未配置 Supabase URL/密钥
- **WHEN** 调用反应 API
- **THEN** 返回 503 且错误体包含可识别的错误码，页面可以据此隐藏反应区

#### Scenario: 高频刷写入

- **WHEN** 同一来源在短时间内发起大量 POST
- **THEN** 超出阈值的请求收到 429

### Requirement: React 反应岛屿与乐观更新

文章页 MUST 在标签区下方挂载一个 React 19 岛屿（`client:visible`，进入视口才水合），通过 TanStack Query（共享单例 QueryClient）读取与变更反应状态。点击未选反应 SHALL 立即乐观增加计数并高亮；点击已选反应 SHALL 立即乐观取消；请求失败 MUST 回滚到变更前快照，请求完成后以服务端返回为准。岛屿仅在 `features.reactions` 开启且 Supabase 公开环境变量存在时渲染。

#### Scenario: 可见时才水合

- **GIVEN** 文章页已加载、反应区位于视口外
- **WHEN** 首屏渲染
- **THEN** 反应区不下载/执行 React，直到滚动进入视口

#### Scenario: 乐观反馈与失败回滚

- **WHEN** 用户点击一个未选反应且网络正常
- **THEN** 计数立即 +1 且按钮高亮，无需等待响应；若服务端返回失败，UI 回滚为点击前状态

#### Scenario: 再次点击取消

- **WHEN** 用户点击已高亮的反应
- **THEN** 立即 −1 并取消高亮，失败时回滚

#### Scenario: 后端不可用时安静降级

- **GIVEN** 反应 API 返回 503/404
- **THEN** 反应区只显示一行不可用提示（含重试入口），不影响文章阅读与页面其余功能

#### Scenario: 未配置环境变量时不渲染

- **GIVEN** `PUBLIC_SUPABASE_URL` 或 `PUBLIC_SUPABASE_ANON_KEY` 缺失
- **WHEN** 构建/渲染文章页
- **THEN** 页面不包含反应岛屿标记

#### Scenario: 视图切换后状态不丢失

- **GIVEN** 用户通过 ClientRouter 离开文章页再返回
- **WHEN** 岛屿重新挂载
- **THEN** 由于 QueryClient 为模块单例，计数立即从缓存呈现且不发生重复请求
