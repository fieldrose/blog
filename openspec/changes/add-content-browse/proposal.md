# Proposal: 内容浏览体系（入口接线 → 分类轴 → 专题）

## Why

文章已增长到 75 篇，磁盘上其实已经有三层组织：`_基础/_操作系统`、`_学习记录/_JavaScript` 的目录树、9 个覆盖 65 篇的专栏（`series`）、54 个标签。但站点只暴露了时间轴：`/posts` 按时间分页，首页是「精选 + 最新 4 篇」，`/tags` 是 54 个无计数、无分层的平铺标签。

两处断点让已有组织成本落空：

- `/series` 页面与文章内的专栏卡片都存在，但 [Header.astro](file:///Users/mimas/Documents/code/blog/src/components/Header.astro#L74-L142) 导航里没有任何入口，`/series` 是孤儿页。
- [getPostPaths.ts](file:///Users/mimas/Documents/code/blog/src/utils/getPostPaths.ts#L6-L16) 用 `.filter(path => !path.startsWith("_"))` 丢弃全部目录段，目录层级既不进 URL 也不进任何列表。

结果是读者只能依赖时间顺序或站内搜索定位内容，「想系统看某块」的路径缺失。本变更按成本从低到高分三阶段补齐浏览维度：先把已有维度接到入口，再引入稳定的两级分类轴，最后做跨专栏的专题聚合。

## What changes

### 阶段一：入口接线（不改 frontmatter、不改 URL）

- Header 桌面导航与移动抽屉增加「专栏」入口（`/series`）；i18n 新增 `nav.series`。
- 首页在精选区块之前增加「专栏」区块，复用 `/series` 的聚合逻辑。该逻辑从 [series/index.astro](file:///Users/mimas/Documents/code/blog/src/pages/_shared/series/index.astro#L11-L40) 抽到 `src/utils/getSeriesList.ts`，两处共用。
- 标签页为每个标签显示文章数，并按「主题 / 技术 / 其他」三组渲染。分组来自新增的静态映射 `src/data/tagGroups.ts`，未命中的标签归入「其他」，不改动任何文章的 `tags`。
- `/posts` 顶部增加一级分类芯片行（含「全部」），链接到 `/categories/[category]`。该芯片行在阶段二产出路由后生效，阶段一先落地组件与数据依赖。

### 阶段二：两级分类轴

- 分类由文件路径派生，不新增 frontmatter：取相对 `src/content/posts` 的目录段，剥离前导 `_`，按 `-` 切分，首段为一级分类，其余段拼为二级分类。`_项目经历-前端项目重构` → 项目经历 / 前端项目重构；`_其他` → 其他（无二级）；根目录文章归入「未分类」。
- 新增 `src/utils/getCategories.ts`，导出 `getCategoryTree(posts)`。
- 新增 `/categories`（一级分类树 + 计数）与 `/categories/[category]`（该一级分类下按二级分组渲染文章，不做二级路由）。
- 新增 `src/data/categories.ts` 提供显示名、描述与排序；未登记的目录回退为目录名。
- 文章 URL 保持不变，避免破坏已有链接、RSS、OG 图与点赞数据。

### 阶段三：专题聚合

- 新增 `src/data/topics.ts`，以文章 id 列表声明跨专栏的阅读路径，每项可带一句推荐语。
- 新增 `/topics` 与 `/topics/[slug]` 页面，按声明顺序渲染。
- 首页增加专题入口区块（最多 3 个）。
- 首批专题：面试专题、性能优化全景。

## Non-goals

- 不重命名任何文章目录，不改动文章 URL 结构。
- 不做标签的自动语义归类（分组为人工维护的静态映射）。
- 不做知识图谱、相关文章推荐、阅读进度统计。
- 不引入全文检索之外的运行时数据源；分类与专题均在构建期静态生成。

## Impact

- 新增 3 个页面族（`/categories`、`/categories/[category]`、`/topics`、`/topics/[slug]`），按项目惯例各需 zh/en 薄封装页，共 8 个包装器。
- i18n 新增 `nav.series`、`nav.categories`、`pages.categories*`、`pages.topics*` 等键，需同步 `src/i18n/types.ts`、`zh.ts`、`en.ts`。
- 导航文案从 3 个增至 5 个，`sm`（640px）断点下会溢出，阶段一需把桌面导航的显示断点从 `sm` 调整到 `md`。
- 无新依赖；分类与专题数据全部在构建期计算。
