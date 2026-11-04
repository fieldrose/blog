# 00 · 项目背景预设（强制前置）

> 本文件是文档生成体系的固定上下文。每次生成文档时，必须在文档开头注入文末的「背景说明模板」，无需用户重复说明项目背景。

## 项目概况

- **项目名称**：mimas-blog —— Mimas 的个人技术博客，主题为前端、框架与工程实践笔记
- **技术栈**：Astro 7 · TypeScript · React 19 · Vue 3 · Tailwind CSS 4 · MDX · content collections
- **基础设施**：pagefind 站内搜索 · Netlify 部署（@astrojs/netlify）· sharp 图像优化 · satori OG 图
- **包管理**：pnpm 12，Node.js >= 22.12
- **仓库**：https://github.com/fieldrose/blog.git ，站点 https://mimas-blog.netlify.app

## 定位与写作基调

- **载体定位**：本博客是用于简历与面试支撑的个人技术输出阵地，而非面向大众的科普平台。
- **亮点嵌入**：项目经历类文章需自然提炼简历 / 面试亮点（遇到的问题 → 思考路径与取舍 → 决策依据 → 落地成果），**禁止**用「亮点」「重点」等标签显式标注。亮点是事实呈现的副产品，不是宣传口号。
- **真实基础**：所有技术细节、数字、案例必须基于真实经历，允许适度抽象但不得虚构或夸大。

## 强制约束（生成内容不得违反）

1. **i18n 双语**：站点为中英双语（zh + en）。新增 UI 字符串必须同时加入 `src/i18n/lang/zh.ts`、`src/i18n/lang/en.ts` 及 `UIStrings` 类型；每个页面需要 zh + en 薄封装页，否则 404。
2. **OpenSpec 工作流**：功能实现遵循 `openspec/` 规范流程，产物使用中文。
3. **构建链路**：`pnpm build` = astro check → astro build → pagefind → 拷贝索引（shx 跨平台）。

## 文档类型参数

| 类型 | 说明 | 额外要求 |
| ---- | ---- | ---- |
| `blog` | 博客文章，进入 src/content | 合规 frontmatter、双语发布提醒、固定 TOC 占位 |
| `tech` | 技术文档（设计 / 调研 / 方案） | 结构与落盘遵循 40-format |

未指定类型时按主题推断；无法确定时向用户确认一次。

## 背景说明模板（每篇文档开头必含）

> 本文属于 Mimas 个人技术博客（Astro 7 + TypeScript + Tailwind CSS 4，中英双语站点）的{博客文章|技术文档}，项目语境见 `.trae/rules/doc-gen/00-context.md`。
