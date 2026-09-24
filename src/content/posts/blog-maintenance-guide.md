---
author: Mimas
pubDatetime: 2026-09-20T08:00:00Z
title: "博客维护指南：从新建文章到内容管理"
slug: blog-maintenance-guide
featured: false
draft: false
tags: [博客, Meta, Docs]
description:
  "这个博客项目的内容管理速查：如何新建文章、frontmatter 各字段的含义、草稿与推荐文章的管理、
  标签与搜索的工作方式、以及中英文双语的注意事项。"
---

这个博客基于 AstroPaper 主题二次开发，用 Astro 7 纯静态生成。文章内容和页面路由是分离的——写文章不需要碰路由代码。这篇记录日常维护中最常遇到的操作。

## Table of contents

## 项目结构速览

与内容相关的目录：

```text
src/
├── content/
│   ├── posts/          # 所有文章（.md / .mdx）
│   └── pages/          # 独立页面（如 about）
├── pages/
│   ├── _shared/        # 页面逻辑（zh/en 共用）
│   ├── zh/             # 中文路由包装器
│   └── en/             # 英文路由包装器
├── i18n/lang/          # UI 文案（zh.ts / en.ts）
└── components/         # 组件
```

关键点：文章放在 `src/content/posts/`，**不是** `src/pages/`。Astro 的 Content Layer 会自动把这个目录下的所有 `.md` 和 `.mdx` 文件收录为文章集合，zh/en 两个语言版本共用同一份内容。

## 新建一篇文章

在 `src/content/posts/` 下新建 `.md` 或 `.mdx` 文件，文件名即默认 slug。

### frontmatter 模板

```yaml
---
author: Mimas
pubDatetime: 2026-09-20T08:00:00Z
title: "文章标题"
slug: my-post-slug
featured: false
draft: false
tags: [前端, 工程化]
description: "摘要会用于 SEO、OG 图和列表页"
---
```

各字段说明：

| 字段           | 必填 | 说明                                                                                          |
| :------------- | :--: | :-------------------------------------------------------------------------------------------- |
| `pubDatetime`  |  ✓   | 发布时间，ISO 8601 格式。不能是未来时间（超过当前时间 + 15 分钟的文章会被过滤）               |
| `modDatetime`  |  —   | 修改时间，有实质性更新时补上                                                                  |
| `title`        |  ✓   | 文章标题                                                                                      |
| `slug`         |  —   | URL 路径，不填则用文件名。子目录会拼入路径（如 `examples/demo.md` → `/posts/examples/demo/`） |
| `featured`     |  —   | `true` 会出现在首页"推荐文章"区                                                               |
| `draft`        |  —   | `true` 的文章不会发布                                                                         |
| `tags`         |  —   | 标签数组，用于标签页聚合和文章页展示                                                          |
| `description`  |  ✓   | 用于 SEO meta、OG 图和列表页摘要                                                              |
| `hideEditPost` |  —   | `true` 隐藏该文章的"编辑页面"链接                                                             |

### `.md` 还是 `.mdx`

- `.md`：纯文字内容，首选
- `.mdx`：需要嵌入 React/Vue 组件或写 JSX 时用

两种文件享受完全相同的渲染管线（代码高亮、Callout、自动目录），区别只在 MDX 额外支持 `import` 组件。详细的语法示例见 [Markdown 与 MDX 写法示例手册](/zh/posts/markdown-mdx-syntax-demo/)。

### 目录约定

正文第一节写 `## Table of contents`，remark-toc 会在此自动生成目录，remark-collapse 会把它折叠成 `<details>` 块。标题文案按页面语言自动切换（中文显示"目录"，英文显示 "Table of contents"），不需要手动处理。

## 管理现有文章

### 修改文章

直接编辑 `src/content/posts/` 下对应的文件。dev server 会热更新，刷新浏览器即可看到变化。

修改后记得更新 `modDatetime`：

```yaml
modDatetime: 2026-09-24T10:00:00Z
```

### 下架文章

把 `draft` 设为 `true`：

```yaml
draft: true
```

文章会从列表、标签页、搜索结果中消失，但文件保留，随时改回 `false` 恢复。

### 推荐文章

把 `featured` 设为 `true`：

```yaml
featured: true
```

推荐文章会出现在首页"推荐文章"区（在"最新文章"之上），同时从"最新文章"列表中排除。目前推荐了两篇：微前端重构实录和前端性能优化。

### 标签管理

标签写在 frontmatter 的 `tags` 数组里，不需要预先注册。标签页和标签筛选自动从所有文章的 tags 聚合生成。中文标签可以正常使用（slug 会保留中文字符）。

建议保持标签数量精简，同类文章用同一标签。当前使用的标签：面试、工程化、兼容性、性能优化、架构、Markdown、MDX、Docs。

## 中英文双语

文章内容是 zh/en 共用的——同一篇文章在两个语言路径下渲染相同内容，区别只在页面框架（导航、按钮、提示文案）。

### 需要双语处理的场景

- **UI 文案**：新增界面文字时，必须同时更新 `src/i18n/lang/zh.ts`、`src/i18n/lang/en.ts` 和 `src/i18n/types.ts` 中的 `UIStrings` 类型，三处保持同步
- **页面路由**：新增页面时需要在 `src/pages/zh/` 和 `src/pages/en/` 各建一个薄包装器，否则非默认语言会 404

### 文章本身不需要双语

文章内容是同一份 Markdown，不区分语言。如果未来需要真正的双语文章，可以考虑按目录拆分（如 `posts/zh/` 和 `posts/en/`），但当前没有做这个拆分。

## 搜索

搜索由 Pagefind 驱动，构建时对 `dist/` 生成索引。不需要手动维护——新文章构建后自动可被搜索。

注意：Pagefind 对中文不支持词干提取（stemming），中文搜索按整词匹配。这是 Pagefind 的已知限制，不影响正常使用。

## OG 图

每篇文章的 OG 图（社交分享预览图）由构建期动态生成，基于文章标题和描述。`dynamicOgImage: true` 已在配置中开启，不需要手动准备图片。

如果需要自定义某篇文章的 OG 图，在 frontmatter 中指定：

```yaml
ogImage: /path/to/custom-og.png
```

## 常用命令

```bash
# 开发（后台运行）
pnpm astro dev --background

# 查看 dev server 状态
pnpm astro dev status

# 类型检查
pnpm astro check

# Lint
pnpm lint

# 构建（产物在 dist/）
pnpm build
```

构建前建议先跑 `astro check` 和 `lint`，确保没有类型错误和代码风格问题。
