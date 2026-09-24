# Spec Delta: search-pagefind

## Purpose

为完全静态预渲染的博客提供零后端全文搜索：Pagefind 在构建后扫描 `dist/` 生成静态索引，搜索页在浏览器内按需加载索引并直接查询，不依赖任何服务器或第三方服务。

## ADDED Requirements

### Requirement: 构建期生成静态搜索索引

系统 MUST 通过构建流程在 `astro build` 之后运行 Pagefind 扫描 `dist/`，并把生成的 `pagefind/` 索引产物复制到 `public/` 供后续构建与部署携带；索引生成 MUST NOT 要求运行中的数据库或搜索服务。

#### Scenario: 生产构建产出索引

- **WHEN** 执行项目的完整 build 脚本（`astro check && astro build && pagefind --site dist && cp -r dist/pagefind public/`）
- **THEN** `dist/pagefind/` 包含索引分片与 UI 资源，并随站点静态发布

#### Scenario: 首次 dev 启动无索引

- **GIVEN** 从未执行过生产构建
- **WHEN** 在 dev 模式打开搜索页
- **THEN** 页面展示需要先运行 `pnpm run build` 的 DEV 提示，而不是报错白屏

### Requirement: 搜索功能开关与降级

搜索 MUST 由 `astro-paper.config.ts` 的 `features.search` 控制：取值 `"pagefind"` 时启用；显式设为 `false` 时搜索页 SHALL 在服务端重写（rewrite）到当前语言的 404 页，导航入口也相应消失。

#### Scenario: 关闭搜索后访问搜索 URL

- **GIVEN** `features.search` 为 `false`
- **WHEN** 访客请求 `/zh/search`
- **THEN** 服务端返回 404 页面的响应

### Requirement: 搜索页懒加载并与站点主题一致

搜索页 MUST 仅在浏览器空闲时（`requestIdleCallback`，降级 `setTimeout`）动态导入 `@pagefind/default-ui`，并通过 CSS 变量把 Pagefind UI 的配色绑定到站点 `data-theme` 主题变量，使亮/暗色模式与主站一致。

#### Scenario: 空闲时才加载搜索库

- **WHEN** 搜索页完成首屏渲染
- **THEN** Pagefind UI 的 JS 不会阻塞首屏，而在空闲回调中动态加载

#### Scenario: 跟随暗色模式

- **GIVEN** 站点处于暗色主题
- **WHEN** 搜索框渲染
- **THEN** 搜索控件背景、文字、边框使用站点暗色 CSS 变量

### Requirement: 查询参数同步与返回链接

搜索交互 MUST 把当前检索词同步到 URL 的 `?q=` 查询参数（`history.replaceState`，不触发整页刷新）：带 `?q=` 打开搜索页时 SHALL 自动触发该检索；清空输入时 SHALL 移除参数；检索词同时写入 `sessionStorage.backUrl` 供阅读完搜索结果返回。

#### Scenario: 深链触发搜索

- **GIVEN** 访客打开 `/zh/search?q=astro`
- **WHEN** Pagefind UI 初始化完成
- **THEN** 自动执行 `astro` 的检索并展示结果

#### Scenario: 输入同步 URL

- **WHEN** 访客输入检索词
- **THEN** 地址栏更新为 `?q=<检索词>` 且页面不刷新

#### Scenario: 清空检索词

- **WHEN** 访客清空搜索输入或点击清除按钮
- **THEN** URL 恢复为不含 `?q=` 的搜索页路径

### Requirement: View Transitions 生命周期安全

搜索容器 MUST 使用 `transition:persist` 跨页面切换保活，初始化脚本 MUST 同时在首次加载与 `astro:after-swap` 事件后运行；在 `astro:after-swap` 中发现容器内已存在搜索表单时 SHALL 跳过重复初始化。

#### Scenario: 客户端路由后不重复初始化

- **GIVEN** 访客通过 ClientRouter 视图切换离开又返回搜索页
- **WHEN** 触发 `astro:after-swap`
- **THEN** 已存在的 Pagefind 表单不会被二次初始化（不出现重复控件/重复请求）
