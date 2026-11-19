# Content Taxonomy

## ADDED Requirements

### Requirement: 由目录派生的两级分类

系统 MUST 提供 `parseCategoryFromPath(filePath)`，从相对 `src/content/posts` 的目录段推导分类：

- 目录段 MUST 先剥离前导 `_`；
- 只有一个目录段时，该段 MUST 按 `-` 切分，首段为一级分类，其余段以 ` / ` 连接为二级分类；
- 有多个目录段时，首段 MUST 作为一级分类，其余段以 ` / ` 连接为二级分类；
- 无目录段时一级分类为「未分类」，二级分类为空；
- 单层目录且不含 `-` 时一级分类有值、二级分类为空。

文章 URL MUST NOT 因该功能发生任何变化。

#### Scenario: 两级目录

- **GIVEN** 文件路径 `src/content/posts/_基础/_操作系统/进程线程与调度.md`
- **WHEN** 调用 `parseCategoryFromPath`
- **THEN** 返回 `{ category: "基础", subcategory: "操作系统" }`

#### Scenario: 目录名内嵌两级

- **GIVEN** 文件路径 `src/content/posts/_项目经历-前端项目重构/SPA架构重建：路由、状态与卡片化首页.md`
- **WHEN** 调用 `parseCategoryFromPath`
- **THEN** 返回 `{ category: "项目经历", subcategory: "前端项目重构" }`

#### Scenario: 单层与根目录

- **GIVEN** 路径分别为 `_其他/博客维护记录.md` 与 `fcp优化.md`
- **WHEN** 调用 `parseCategoryFromPath`
- **THEN** 前者返回 `{ category: "其他" }`，后者返回 `{ category: "未分类" }`

### Requirement: 分类树聚合

`getCategoryTree(posts)` MUST 输出一级分类数组，每项包含 `name`、`slug`、`count`、`children`；`children` 为二级分类数组，同样包含 `name`、`slug`、`count`。草稿 MUST 被排除。一级分类 MUST 按 `src/data/categories.ts` 的 `order` 升序，未登记的分类排在已登记项之后并按名称排序。

#### Scenario: 计数包含二级归属

- **GIVEN** 「学习记录」下有 17 篇 JavaScript 与 4 篇 TypeScript 文章
- **WHEN** 调用 `getCategoryTree`
- **THEN** 「学习记录」的 `count` 为 21，`children` 中含 `JavaScript`（17）与 `TypeScript`（4）

#### Scenario: 草稿不参与统计

- **GIVEN** 某分类下有 1 篇文章 `draft: true`
- **WHEN** 构建分类树
- **THEN** 该文章不计入任何 `count`，也不出现在分类页列表

### Requirement: 分类索引页

`/categories` MUST 渲染一级分类树，每项显示分类名、描述（来自 `categories.ts`，缺失时省略）与文章数，并链接到 `/categories/<category>/`。

#### Scenario: 进入分类索引

- **GIVEN** 站点有 4 个一级分类
- **WHEN** 访问 `/categories`
- **THEN** 页面按配置顺序列出 4 个分类，并显示各自的文章总数

### Requirement: 分类详情页

`/categories/[category]` MUST 按二级分类分组渲染该一级分类下的文章；无二级分类的文章 MUST 直接列在分类顶部。每个分组 MUST 显示分组名与该组文章数。分类不存在时 MUST 在构建期省略该路由，不得输出空页面。

#### Scenario: 按二级分组呈现

- **GIVEN** 访问 `/categories/学习记录/`
- **WHEN** 页面渲染完成
- **THEN** 出现「JavaScript」「TypeScript」等分组标题，各组下列出对应文章

#### Scenario: 无二级分类的文章

- **GIVEN** 访问 `/categories/其他/`
- **WHEN** 页面渲染完成
- **THEN** 该分类下的文章直接以列表形式出现，不出现空的分组标题

### Requirement: 分类的双语路由

分类相关页面 MUST 同时提供 `/zh/categories` 与 `/en/categories` 两套薄封装页，`_shared` 下承载实际逻辑；缺少任一语言包装器导致 404 视为不满足要求。

#### Scenario: 英文路由可达

- **GIVEN** 访问 `/en/categories/`
- **WHEN** 页面加载
- **THEN** 返回 200 并渲染分类树，页面文案取自英文 i18n
