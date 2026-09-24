# Proposal: 反向建档现有 i18n 与 Pagefind 搜索能力

## Why

本仓库即将引入认证、反应反馈、统计、AI 助手、PWA 等新能力，并以 OpenSpec 规格驱动组织全部后续变更。但两个**已经存在且被全站依赖**的基础能力——中英双语 i18n 体系与 Pagefind 静态全文搜索——目前只有代码事实、没有可评审的规格。

在新增能力之前先对存量行为做反向建档（reverse specification），可以：

1. 为后续所有变更提供需求基线（例如新岛屿必须同时提供 zh/en 文案、必须遵循 `_shared` + 语言薄包装的页面结构）。
2. 把散落在配置与组件中的隐式约定（locale 单一数据源、缺失语言包装页会 404、搜索索引仅在构建后可用、View Transitions 下不重复初始化等）固化为 GIVEN/WHEN/THEN 验收场景。
3. 验证团队的 OpenSpec 工作流（change → validate → archive）本身可跑通，再进入功能开发。

本变更**只写规格、不改任何运行时代码**。

## What changes

- 新增能力规格 `i18n`：描述 locale 配置单一数据源、`/zh` `/en` 前缀路由、默认语言与重定向、`_shared` 页面逻辑与语言薄包装结构、UI 文案装载与英文兜底、语言切换保持路径。
- 新增能力规格 `search-pagefind`：描述 Pagefind 作为构建期静态索引的工作方式、`features.search` 开关与 404 降级、搜索页懒加载 UI、`?q=` 查询参数同步、`transition:persist` + `astro:after-swap` 生命周期约定、dev 模式提示、索引产物来源（构建脚本）。

## Non-goals

- 不新增/删除任何 locale，不改变默认语言（仍为 zh）。
- 不更换搜索方案（不接入 Algolia/动态索引）。
- 不重构现有 i18n 或搜索代码。
- 不覆盖尚未实施的新能力（auth、reactions、analytics、ai-assistant、pwa），它们将各自走独立 change。

## Impact

- 仅新增 `openspec/changes/document-existing-i18n-search/` 下的文档产物；archive 后沉淀到 `openspec/specs/i18n/` 与 `openspec/specs/search-pagefind/`。
- 零运行时影响、零依赖变更。
