# Content Browse

## ADDED Requirements

### Requirement: 导航暴露专栏与分类入口

Header 的桌面导航与移动抽屉 MUST 同时包含指向 `/series` 与 `/categories` 的链接，且 MUST 使用 i18n 键 `nav.series` 与 `nav.categories` 渲染文案，不得硬编码中文。当前路径命中时 MUST 复用现有 `isActive` 逻辑高亮。

桌面文本导航 MUST 在 `md` 断点及以上显示、`md` 以下隐藏，以保证 5 个文本链接加图标区在 640–767px 区间不溢出。

#### Scenario: 桌面导航可进入专栏页

- **GIVEN** 视口宽度 ≥ 768px
- **WHEN** 访问任意页面并点击导航中的「专栏」
- **THEN** 跳转到 `/<locale>/series/`，且该导航项呈现激活态

#### Scenario: 平板宽度使用抽屉导航

- **GIVEN** 视口宽度在 640–767px 之间
- **WHEN** 打开移动抽屉
- **THEN** 抽屉内可见「分类」与「专栏」入口，页面不出现水平滚动条

#### Scenario: 英文页面文案同步

- **GIVEN** 当前 locale 为 `en`
- **WHEN** 渲染 Header
- **THEN** 两个新增入口分别显示 `src/i18n/lang/en.ts` 中 `nav.series` 与 `nav.categories` 的值

### Requirement: 首页专栏入口区块

首页 MUST 在精选区块之前渲染「专栏」区块，作为预览而非完整索引：按文章数降序最多展示 6 个专栏，每一项 MUST 显示名称与文章数并链接到 `/series/<series>/`。区块标题右侧 MUST 在存在未展示专栏时提供指向 `/series` 的「全部专栏」入口；全部专栏都能在区块内看到时 MUST NOT 渲染该入口。当文章集合中不存在任何 `series` 时，该区块 MUST 不渲染。

该区块与 `/series` 索引页 MUST 共用同一个聚合函数 `getSeriesList(posts)`，输出按专栏首篇文章时间倒序排列，不得各写一份实现；首页仅在渲染时按文章数重排并截取前 6 个。

#### Scenario: 首页只展示内容最厚的六个专栏

- **GIVEN** 内容集合中存在 9 个 `series`，其中「设计模式」22 篇为最多
- **WHEN** 访问首页
- **THEN** 页面出现标题为 `t.home.series` 的区块，包含 6 个带篇数的专栏链接，「设计模式」在列，并展示「全部专栏」入口

#### Scenario: 没有未展示的专栏时不渲染入口

- **GIVEN** 内容集合中存在 5 个 `series`
- **WHEN** 构建首页
- **THEN** 5 个专栏全部出现在区块内，且不出现「全部专栏」链接

#### Scenario: 无专栏时不留空区块

- **GIVEN** 所有文章的 `series` 字段均为空
- **WHEN** 构建首页
- **THEN** 页面不包含专栏区块的标题与空列表容器

### Requirement: 标签页计数与分组

`/tags` 页 MUST 为每个标签显示其关联文章数，并按 `src/data/tagGroups.ts` 声明的组顺序渲染组标题；未命中任何分组的标签 MUST 归入「其他」组，不得丢弃。组内标签 MUST 按文章数降序、同数量按名称排序。

分组配置缺失或为空时 MUST 退化为单一扁平列表并仍显示计数。

#### Scenario: 标签显示文章数

- **GIVEN** 标签「设计模式」关联 22 篇文章
- **WHEN** 访问 `/tags`
- **THEN** 该标签旁显示 `22`

#### Scenario: 未配置分组的标签进入其他组

- **GIVEN** 存在标签 `TLS` 且 `tagGroups` 未声明它
- **WHEN** 渲染标签页
- **THEN** `TLS` 出现在「其他」组内，且其 `/tags/<slug>` 链接与改动前一致

### Requirement: 面包屑的段名翻译

面包屑 MUST 通过 `navLabels` 映射把已知路由段翻译为当前语言文案，至少覆盖 `posts`、`series`、`categories`、`tags`、`about`、`archives`、`search`、`demos`。未登记的段 MUST 回退为解码后的路径原文。

强制小写 MUST 只作用于 `tags` 路由下的段，避免系列名 `JavaScript` 被渲染为 `javascript`。

#### Scenario: 中文系列页的面包屑

- **GIVEN** 访问 `/zh/series/网络-前端视角/`
- **WHEN** 渲染面包屑
- **THEN** 显示「首页 » 专栏 » 网络-前端视角」，不出现英文 `Series`

#### Scenario: 英文页保留系列名大小写

- **GIVEN** 访问 `/en/series/JavaScript/`
- **WHEN** 渲染面包屑
- **THEN** 末段显示 `JavaScript`，而非 `javascript`

#### Scenario: 分类页的面包屑

- **GIVEN** 访问 `/zh/categories/基础/`
- **WHEN** 渲染面包屑
- **THEN** 显示「首页 » 分类 » 基础」

### Requirement: 文章列表分类芯片

`/posts` 页 MUST 在主标题下方渲染一级分类芯片行，包含「全部」与每个一级分类，当前分类项 MUST 高亮。「全部」链接到当前 locale 的 `/posts`。

#### Scenario: 从文章列表进入分类

- **GIVEN** 访问 `/posts`
- **WHEN** 点击「基础」芯片
- **THEN** 跳转到 `/categories/基础/`，并在该页看到「基础」下的文章
