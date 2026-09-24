# Spec Delta: i18n

## Purpose

为博客提供中英双语（zh 默认、en）的路由、页面与 UI 文案体系：所有页面均按 locale 前缀提供，语言切换保持当前路径，新增界面必须同时具备两种语言的文案。

## ADDED Requirements

### Requirement: Locale 单一数据源

系统 SHALL 以 `src/i18n/locales.ts` 作为 locale 的唯一数据源，其中至少包含 `zh`（默认）与 `en` 两个 locale；`astro.config.ts` 的构建期 i18n 配置与 Header 的语言切换菜单 MUST 都从该模块派生，不允许各自硬编码语言列表。

#### Scenario: 语言列表被两处复用

- **GIVEN** `src/i18n/locales.ts` 导出 `zh` 与 `en`
- **WHEN** 站点构建且 Header 渲染语言菜单
- **THEN** Astro i18n 路由与切换菜单呈现的语言集合一致

#### Scenario: 新增一个 locale

- **WHEN** 未来在 `locales.ts` 增加一个语言
- **THEN** 构建配置与菜单自动包含它，无需改动这两处消费方

### Requirement: Locale 前缀路由与默认语言

系统 MUST 使用带前缀的 locale 路由：默认语言为 `zh` 且 `prefixDefaultLocale` 与 `redirectToDefaultLocale` 均启用，因此所有页面 URL 都以 `/zh/` 或 `/en/` 开头，访问站点根路径时 SHALL 重定向到默认语言前缀。

#### Scenario: 访问根路径

- **WHEN** 访客请求 `/`
- **THEN** 站点返回到 `/zh/` 的重定向

#### Scenario: 每种语言都有独立 URL

- **GIVEN** 一篇文章的 slug 为 `example`
- **WHEN** 分别请求 `/zh/posts/example/` 与 `/en/posts/example/`
- **THEN** 两个 URL 各自返回 200，且 `html lang` 分别为 `zh` 与 `en`

### Requirement: _shared 页面逻辑与语言薄包装

页面实现 MUST 集中在 `src/pages/_shared/`，每种语言在 `src/pages/zh/`、`src/pages/en/` 下只提供薄包装页（复用同一份 `getStaticPaths` 并渲染共享父组件）。任何在 `_shared` 存在但缺少某种语言包装的路由，在该语言下 MUST 表现为 404。

#### Scenario: 新增页面必须补齐两种包装

- **GIVEN** 开发者在 `_shared` 新增了一个页面
- **WHEN** 只创建了 zh 包装而没有 en 包装
- **THEN** 访问对应 `/en/...` 路径返回 404

#### Scenario: 业务逻辑不重复

- **WHEN** 修改某个页面的数据获取或渲染逻辑
- **THEN** 只需修改 `_shared` 一份实现，zh/en 包装页不包含重复业务逻辑

### Requirement: UI 文案双语齐备且可类型检查

所有界面文案 MUST 定义在 `src/i18n/lang/zh.ts` 与 `src/i18n/lang/en.ts`，并由 `src/i18n/types.ts` 的 `UIStrings` 类型约束；语言包通过 `import.meta.glob` 自动装载，`useTranslations(locale)` 在命中缺失语言时 SHALL 回退到 `en`。新增任何用户可见字符串时，两种语言文件 MUST 同步更新（类型检查会强制键齐备）。

#### Scenario: 取当前语言文案

- **GIVEN** 当前 locale 为 `zh`
- **WHEN** 组件调用 `useTranslations("zh")`
- **THEN** 返回中文语言包

#### Scenario: 缺失语言回退英文

- **WHEN** 请求一个没有对应语言包的 locale
- **THEN** `useTranslations` 返回英文语言包而不是抛出错误

#### Scenario: 新增字符串受类型约束

- **WHEN** 开发者只在 `zh.ts` 增加一个新键
- **THEN** `pnpm astro check` 因 `en.ts` 缺少该键而报错

### Requirement: 语言切换保持当前路径

Header 的语言切换菜单 MUST 依据当前 URL 剥离现有 locale 前缀、再以目标 locale 重建同一路径，使访客切换语言后停留在对应的同类页面而非回到首页。

#### Scenario: 文章页切换语言

- **GIVEN** 访客位于 `/zh/posts/example/`
- **WHEN** 点击切换到 English
- **THEN** 浏览器导航到 `/en/posts/example/`

#### Scenario: 列表分页与标签页同样保持路径

- **GIVEN** 访客位于某个标签或分页详情 URL
- **WHEN** 切换语言
- **THEN** 目标 URL 保留 locale 之后的完整路径段
