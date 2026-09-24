# Tasks: 反向建档 i18n 与 Pagefind 搜索

> 本变更为纯文档反向建档，无运行时代码改动。

## 1. 调研与建档

- [x] 1.1 核对 i18n 现状：`locales.ts` 单一数据源、`astro.config.ts` 前缀路由（默认 zh、redirectToDefaultLocale）、`_shared` + `zh/en` 薄包装结构、`useTranslations` 英文兜底、Header 切换保持路径
- [x] 1.2 核对搜索现状：build 脚本 `pagefind --site dist` + 复制到 `public/`、`features.search` 开关、`search.astro` 的空闲懒加载、`?q=` 同步、`transition:persist` 与 `astro:after-swap` 防重复初始化
- [x] 1.3 编写 proposal、`specs/i18n/spec.md`、`specs/search-pagefind/spec.md`（纯反向建档，无 design 决策，故不创建 design.md）

## 2. 校验与归档

- [x] 2.1 运行 `npx @fission-ai/openspec@latest validate document-existing-i18n-search --strict` 通过
- [x] 2.2 CI（`.github/workflows/ci.yml`）增加 openspec validate 门禁
- [x] 2.3 archive 本变更，确认规格沉淀到 `openspec/specs/i18n/` 与 `openspec/specs/search-pagefind/`
- [x] 2.4 归档后再次 `openspec validate --strict`（针对 specs）通过
