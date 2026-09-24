# auth Specification

## Purpose
为读者提供邮箱注册/登录与 GitHub OAuth 登录，会话纯客户端（PKCE）管理并驱动全站查询状态；登录后文章反应绑定账号、退出后匿名继续。所有认证 UI 为 React 19 岛屿，未配置环境时不输出。

## Requirements

### Requirement: 会话状态与 TanStack 缓存联动

客户端 MUST 使用 supabase-js PKCE 客户端（持久化会话、自动刷新、URL 检测），并把当前用户状态以查询键 `["auth","user"]` 放入 React 与 Vue 共享的单例 QueryClient。当收到 `SIGNED_IN`/`SIGNED_OUT`/`TOKEN_REFRESHED` 事件时 MUST 更新该缓存，并在登录/退出时失效全部 `["reactions"]` 查询使其按新身份重取。无有效会话时缓存值为 null（不是 loading 永久态）。

#### Scenario: 刷新后恢复登录态

- **GIVEN** 用户此前登录且会话未过期
- **WHEN** 打开或刷新任意页面
- **THEN**  Header 岛屿水合后从本地存储恢复会话并显示用户菜单，无需重新登录

#### Scenario: 登录后反应查询自动切换身份

- **GIVEN** 用户先以匿名身份查看了某文章的反应状态
- **WHEN** 登录成功
- **THEN** 所有反应查询被失效并按新用户身份重取，已选状态反映账号投票

#### Scenario: 退出后回到匿名

- **WHEN** 用户点击退出
- **THEN** 用户缓存置为 null，反应查询按 client_id 重取

### Requirement: 邮箱注册与登录对话框

系统 MUST 提供一个无障碍对话框组件，含登录/注册两个 Tab。登录接受邮箱+密码；注册额外要求确认密码（不一致禁止提交）并校验非空与密码长度下限（8）。提交期间按钮禁用并显示加载态；Supabase 返回的错误（错误凭据、邮箱已注册等）MUST 以本地化文本展示在表单内。注册成功且项目开启邮箱确认时 MUST 显示"请查收确认邮件"提示而不是假装已登录。

#### Scenario: 登录失败展示错误

- **GIVEN** 用户输入错误密码
- **WHEN** 提交登录
- **THEN** 对话框保持打开并显示错误提示，不跳转

#### Scenario: 注册二次确认密码校验

- **WHEN** 注册表单中两次密码不一致或短于 8 位
- **THEN** 提交被阻止并在字段附近提示原因

#### Scenario: 注册成功待确认

- **WHEN** 邮箱注册接口返回但需要邮件确认
- **THEN** 显示查收邮件提示视图，用户明白需点邮件链接

### Requirement: GitHub OAuth（PKCE）

对话框 MUST 提供 GitHub 登录按钮，使用 `signInWithOAuth({ provider: "github", redirectTo: <PUBLIC_SITE_URL>/<locale>/auth/callback })` 发起 PKCE 流程；code verifier 由浏览器保存。回调页 MUST 用 `exchangeCodeForSession` 完成交换。

#### Scenario: OAuth 回调换会话

- **GIVEN** 用户从 GitHub 授权页带 `?code=` 跳回
- **WHEN** 打开 `/<locale>/auth/callback?code=...`
- **THEN** 页面对 Supabase 完成 code 交换并跳回来源页，Header 显示已登录

#### Scenario: 回调失败

- **WHEN** code 交换返回错误（过期/拒绝）
- **THEN** 回调页显示错误与返回首页链接，不产生残缺会话

### Requirement: 邮件确认链接回调

`/<locale>/auth/callback` MUST 同时处理邮件确认链接携带的 `token_hash` + `type`，调用 `verifyOtp` 建立会话后跳转；无法识别的参数 MUST 跳转首页而非停在空白页。回调页必须同时提供 zh/en 语言包装（遵循项目页面约定）。

#### Scenario: 点击确认邮件

- **GIVEN** Supabase 发出的确认链接指向 `/<locale>/auth/callback?token_hash=...&type=email`
- **WHEN** 用户点击该链接
- **THEN** 会话建立并跳转到首页（或 next 指定的页面）

### Requirement: 用户菜单与退出

已登录时 Header MUST 显示用户入口（头像或邮箱首字母），展开后显示邮箱与退出按钮；退出 MUST 调用 `supabase.auth.signOut()` 并关闭菜单。未登录显示"登录"入口按钮，点击打开认证对话框。对话框 MUST 支持 Esc 关闭、点击遮罩关闭，并正确设置 `aria-modal`/`role="dialog"`。

#### Scenario: 退出登录

- **WHEN** 已登录用户打开菜单点击退出
- **THEN** 会话清除，Header 恢复为"登录"按钮，页面跳转到需要身份的区域时自动呈现匿名视图

#### Scenario: 键盘关闭对话框

- **WHEN** 对话框打开时按 Esc
- **THEN** 对话框关闭且焦点回到触发按钮

### Requirement: 功能门控与降级

认证岛屿 MUST 仅在 `features.auth` 为真且 `PUBLIC_SUPABASE_URL`、`PUBLIC_SUPABASE_ANON_KEY` 均存在时渲染；回调页 MUST 始终存在但缺环境变量时给出错误提示。Supabase 不可达时对话框 MUST 显示错误，不影响博客阅读。

#### Scenario: 未配置环境变量

- **GIVEN** 两个公开环境变量缺失
- **THEN** Header 不输出任何认证岛屿标记，构建与阅读完全正常
