# Proposal: Supabase Auth 登录注册（React 岛屿）

## Why

反应反馈（add-post-reactions）的登录态投票路径已经在 BFF 与 RLS 就绪，但读者还没有入口成为"用户"：没有注册/登录 UI、没有 GitHub 登录、没有会话管理。本变更新增完整认证闭环，让反应投票可以绑定账号跨设备跟随，并为后续统计页等能力提供身份基础。这是简历叙事中「Supabase Auth（邮箱 + OAuth、PKCE、会话刷新）+ RLS 本人策略」闭环的最后一块。

## What changes

- 新增 React 19 岛屿（挂载到全站 Header，`client:idle`）：
  - `UserMenu.tsx`：未登录显示"登录"按钮；已登录显示头像/首字母下拉（邮箱、退出）。
  - `AuthDialog.tsx`：登录/注册双 Tab 弹窗（邮箱+密码、确认密码、加载/错误态、注册后"去收信"提示）、GitHub OAuth 按钮；Esc/遮罩关闭、基础焦点管理。
- 新增 `src/lib/auth/useAuth.ts`：封装 supabase-js（`onAuthStateChange` + `getSession`），会话以 `["auth","user"]` 注入共享 TanStack Query 缓存；提供 signIn/signUp/signOut/signInWithGithub；登录态变化时失效全部 reactions 查询，使投票即时切换身份。
- 新增静态回调页 `/<locale>/auth/callback`（遵循 `_shared` + zh/en 薄包装约定）：处理 PKCE `code` 交换与邮件确认链接 `token_hash` 校验，完成后跳回来源页或首页。
- OAuth/邮件回调基址取 `PUBLIC_SITE_URL`（按当前页面 locale 拼接路径）；i18n 文案 zh/en 齐备；岛屿受 `features.auth` + Supabase 公开环境变量双门控。

## Non-goals

- 不做个人资料编辑页（profiles 表与触发器已在 0001 迁移就位）。
- 不做忘记密码/重置密码自助流程（Supabase 控制台可手动发重置邮件；留待后续）。
- 不做服务端 SSR 会话（站点保持 SSG，会话纯客户端；BFF 每次按 Bearer 校验）。
- 不新增除 GitHub 外的第三方 provider。

## Impact

- 新增页面 `/auth/callback`（静态预渲染，仅几行内联脚本）。
- 需在 Supabase 控制台登记回调 URL（本地/preview/生产）并启用 GitHub provider。
- React 岛屿在 Header 按需水合，未开启功能或无 env 时零 JS 输出。
