# Tasks: Supabase Auth 登录注册

## 1. 文案与状态层

- [x] 1.1 i18n：`auth` 文案键加入 `types.ts`、zh.ts、en.ts
- [x] 1.2 `src/lib/auth/useAuth.ts`：getSession 种子 + onAuthStateChange 写共享缓存；signIn/signUp/signOut/github；登录/退出失效 reactions 查询
- [x] 1.3 auth 错误码本地化映射

## 2. 组件

- [x] 2.1 `AuthDialog.tsx`：登录/注册 Tab、确认密码校验、GitHub 按钮、加载/错误/查收邮件态、Esc/遮罩关闭、焦点返回
- [x] 2.2 `UserMenu.tsx`：未登录入口按钮 / 已登录首字母下拉（邮箱、退出），client:idle，自包 QueryProvider
- [x] 2.3 Header 注入（feature flag + env 双门控）

## 3. 回调

- [x] 3.1 `src/pages/_shared/auth/callback.astro` + zh/en 薄包装：code 交换 / token_hash 校验 / 失败提示 / next 跳转（裸根路径在 i18n 路由下返回 404，必须本地化）
- [x] 3.2 `.env.example` 补 DATABASE_URL 与回调 URL 说明

## 4. 验证

- [x] 4.1 astro check / lint / build 通过；无 env 零岛屿、有 env 有岛屿（双构建）
- [x] 4.2 浏览器冒烟：对话框开关/Tab/校验/错误态/Esc（假地址仅验证交互）；`/zh/auth/callback` 与 `/en/auth/callback` 均 200
- [x] 4.3 `openspec validate add-auth --strict`
- [x] 4.4 真实 Supabase 端到端（2026-09-24）：邮箱密码登录（service-role admin 预确认用户）→ 会话持久化/刷新 → UserMenu 显示邮箱 → 登出后会话清除；注册请求经 UI 正常发出并展示本地化错误（项目内置 SMTP 触发 `over_email_send_rate_limit`，确认邮件链路需配置自定义 SMTP 后才能人工完整走通）；登录态/匿名/退出三身份投票切换随 reactions 联调验证。GitHub OAuth 待 Dashboard 配置 provider 与回调白名单（`http://localhost:4321/zh/auth/callback`、`/en/...`）后另行验证，代码路径已就绪
