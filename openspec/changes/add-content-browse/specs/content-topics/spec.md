# Content Topics

## ADDED Requirements

### Requirement: 专题数据源

`src/data/topics.ts` MUST 以数组形式声明专题，每项包含 `slug`（英文标识，用于 URL）、`title`、`description`、`items`；`items` 中每项 MUST 包含 `id`（文章在 `src/content/posts` 下的相对路径，不含扩展名）与可选的 `note`。专题顺序 MUST 由数组顺序决定。

#### Scenario: 专题条目按声明顺序

- **GIVEN** `topics` 中「面试专题」的 `items` 依次为 A、B、C
- **WHEN** 渲染该专题页
- **THEN** 列表顺序为 A、B、C

### Requirement: 专题条目的构建期校验

专题引用的每个 `id` MUST 能在内容集合中解析到一篇非草稿文章。任一 `id` 无法解析时 MUST 使构建失败并输出该 `id`，不得静默跳过。

#### Scenario: 引用不存在的文章

- **GIVEN** 某专题引用了 `_学习记录/_JavaScript/不存在`
- **WHEN** 执行 `pnpm build`
- **THEN** 构建失败并指出该无法解析的 `id`

#### Scenario: 引用草稿文章

- **GIVEN** 某专题引用的文章 `draft: true`
- **WHEN** 构建专题页
- **THEN** 该文章不渲染，且构建期给出提示

### Requirement: 专题索引页

`/topics` MUST 列出全部专题，显示标题、描述与条目数，并链接到 `/topics/<slug>/`。无专题声明时 MUST 显示空状态文案，不得渲染空列表。

#### Scenario: 进入专题索引

- **GIVEN** 声明了 2 个专题
- **WHEN** 访问 `/topics`
- **THEN** 页面显示 2 个专题卡片，各自标注条目数

### Requirement: 专题详情页

`/topics/[slug]` MUST 按声明顺序渲染文章，每项显示序号、标题、发布时间与可选的一句 `note`，标题链接 MUST 复用 `getPostUrl` 以保持 locale 与 base 正确。

#### Scenario: 专题内跳转保持语言

- **GIVEN** 当前 locale 为 `en`
- **WHEN** 点击专题内的文章标题
- **THEN** 跳转到 `/en/posts/...` 而非中文路径

### Requirement: 首页专题入口

首页 MUST 渲染最多 3 个专题的入口区块，按声明顺序取前 3 项，并 MUST 在存在未展示专题时提供指向 `/topics` 的「全部专题」入口；专题总数不超过 3 时 MUST NOT 渲染该入口，避免入口页与首页内容完全重复。专题总数为 0 时 MUST 不渲染该区块。

#### Scenario: 首页只展示前三项

- **GIVEN** 声明了 5 个专题
- **WHEN** 访问首页
- **THEN** 首页专题区块只出现前 3 个，且提供指向 `/topics` 的「全部专题」入口

#### Scenario: 专题不超过三个时不重复入口

- **GIVEN** 声明了 2 个专题
- **WHEN** 构建首页
- **THEN** 两个专题都出现在区块内，且不出现「全部专题」链接

### Requirement: 专题的双语路由

`/topics` 与 `/topics/[slug]` MUST 同时提供 zh 与 en 两套薄封装页，`_shared` 下承载实际逻辑；页面 chrome 文案 MUST 通过 i18n 键获取，专题自身的 `title` 与 `description` 按内容处理，允许中文。

#### Scenario: 英文专题列表可达

- **GIVEN** 访问 `/en/topics/`
- **WHEN** 页面加载
- **THEN** 返回 200，页面标题与「条目数」等 chrome 文案为英文
