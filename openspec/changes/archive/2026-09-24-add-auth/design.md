# Design: Supabase Auth 登录注册

## Context

站点 SSG，会话纯客户端。已有浏览器 Supabase 单例（PKCE、persistSession、detectSessionInUrl）、共享 TanStack QueryClient、`apiFetch` 自动注入 Bearer。profiles 触发器与 reactions RLS 已在迁移 0001 就位。BFF 通过 `authenticate()` 校验 Bearer。

## Decisions

### 1. 会话状态：supabase 订阅 → 查询缓存

`useAuth` 在 effect 中先 `getSession()` 种子缓存，再订阅 `onAuthStateChange`：事件直接 `queryClient.setQueryData(["auth","user"], userOrNull)`。不把 supabase 当 queryFn 轮询；订阅是唯一写入者，卸载时退订。登录/退出事件额外 `invalidateQueries({queryKey:["reactions"]})`，让 PostReactions 立刻按新身份重取。

### 2. 岛屿边界

Header 全站每页都有，React 只放一个 `UserMenu`（`client:idle`）。`AuthDialog` 由 UserMenu 内部按需挂载（不额外占 island slot，同属一个 React 根，状态传递零成本）。

### 3. 回调页：静态页 + 内联脚本

`src/pages/auth/callback.astro` 是无 locale 前缀的静态预渲染页。脚本读 query：有 `code` → `exchangeCodeForSession(code)`；有 `token_hash`+`type` → `verifyOtp`；无论成败最后跳转 `next` 或 `/`（保留 locale 由站点根重定向到 /zh）。不做服务端回调（无需密钥、无 SSR 会话）。

### 4. OAuth 跳转地址

`redirectTo = ${PUBLIC_SITE_URL}/auth/callback`，PUBLIC_SITE_URL 默认 http://localhost:4321。三套环境（本地/Netlify preview/生产）必须在 Supabase Auth URL 配置中登记；这是部署文档事项，不写死在代码。

### 5. 错误与加载态

每个异步动作局部 useReducer/useState 管理 `idle|loading|error|done`；错误消息走 i18n 已知码映射（invalid_credentials、user_already_exists、email_not_confirmed 等），未知错误回退通用文案。

## Risks

- **邮箱确认开关**：默认开启时注册无法立即登录——对话框显式展示查收邮件态；.env.example 已注明测试期可在控制台关闭。
- **PKCE verifier 同源依赖**：回调必须同源；PUBLIC_SITE_URL 与实际访问域名必须一致，文档强调。
- **多岛屿重复订阅**：Header 单岛屿 + effect cleanup 控制；模块级 supabase 客户端保证监听器可去重语义。
