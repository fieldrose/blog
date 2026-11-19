# Tasks: 内容浏览体系

## 阶段一：入口接线

- [x] 1.1 i18n 新增 `nav.series`、`nav.categories`、`home.series`、`home.allSeries`、`pages.series*`、`tags.*` 键，同步 `src/i18n/types.ts`、`lang/zh.ts`、`lang/en.ts`
- [x] 1.2 抽取 `src/utils/getSeriesList.ts`，替换 [series/index.astro](file:///Users/mimas/Documents/code/blog/src/pages/_shared/series/index.astro) 内的内联聚合逻辑，并补齐该页与 [系列详情页](file:///Users/mimas/Documents/code/blog/src/pages/_shared/series/[series]/index.astro) 的 i18n 文案
- [x] 1.3 [Header.astro](file:///Users/mimas/Documents/code/blog/src/components/Header.astro) 桌面导航加「专栏」链接，显示断点由 `sm` 改为 `md`（导航、汉堡按钮、遮罩、抽屉四处同步）；移动抽屉同步加入口。**「分类」入口推迟到阶段二**，避免路由落地前出现 404
- [x] 1.4 首页在精选区块前插入专栏区块，无专栏时不渲染；作为预览按文章数取前 6 个（`设计模式` 22 篇起），右上角保留「全部专栏」入口
- [x] 1.5 新增 `src/data/tagGroups.ts`；改写 [tags/index.astro](file:///Users/mimas/Documents/code/blog/src/pages/_shared/tags/index.astro) 输出计数与分组，未命中标签归入「其他」
- [x] 1.6 验证：`astro check` 0 error、`astro build` 通过；Playwright 实测 390 / 700 / 767 / 768 / 900 / 1024 / 1280 七档宽度均无横向溢出，768px 处从抽屉切到桌面导航；英文导航在 `gap-x-4` 下溢出 28px，已改为 `md:gap-x-2`；专栏区块 9 张卡在三个断点下均无标题换行

## 阶段二：两级分类轴

- [x] 2.0 面包屑段名翻译：[Breadcrumb.astro](file:///Users/mimas/Documents/code/blog/src/components/Breadcrumb.astro#L27-L36) 的 `navLabels` 补 `series`、`categories`；强制 `lowercase` 收窄为仅在 `tags` 路由生效
- [x] 2.1 补「分类」入口：桌面端用文件夹图标按钮并入图标区（`IconFolder`，与搜索/主题同尺寸同 `active-nav` 规则），「归档」图标从桌面图标区移入移动抽屉；抽屉内「分类」用 `IconFolder`、「归档」保持 `IconArchive`
- [x] 2.2 新增 `src/utils/getCategories.ts`：`parseCategoryFromPath` + `getCategoryTree`，排除草稿
- [x] 2.3 新增 `src/data/categories.ts`：一级分类的描述与 `order`，未登记分类回退为目录名
- [x] 2.4 新增 `/categories` 索引页（`_shared` 逻辑 + zh/en 薄封装）
- [x] 2.5 新增 `/categories/[category]` 详情页，按二级分类分组，无二级文章置顶（`_shared` + zh/en 薄封装）
- [x] 2.6 `/posts` 顶部加一级分类芯片行，当前分类高亮
- [x] 2.7 验证：`astro check` 0 error、`pnpm build` 通过；分类计数与目录实际文章数一致（基础 9 / 学习记录 57 / 项目经历 6 / 其他 2 / 未分类 1，合计 75）；`dist/{zh,en}/posts` 各 83 个页面（75 篇文章 + 8 个分页），无分类层级混入文章 URL；中英文导航在 768/1280 下均单行无溢出；抽屉入口为文章/分类/专栏/标签/关于/归档

## 阶段三：专题聚合

- [x] 3.1 新增 `src/data/topics.ts`，首批声明「面试专题」（9 篇）与「性能优化全景」（8 篇），条目使用文章 id
- [x] 3.2 新增 `/topics` 索引页与空状态（`_shared` + zh/en 薄封装）
- [x] 3.3 新增 `/topics/[slug]` 详情页，构建期校验 id 可解析，渲染序号/标题/时间/note；`resolveTopics` 同时跳过草稿并告警
- [x] 3.4 首页插入专题入口区块，取前 3 项并提供「全部专题」链接
- [x] 3.5 验证：故意写入错误 id `JS基础` 时构建失败并输出 `专题「面试专题」引用了不存在的文章 id: JS基础`；`/zh/topics/`、`/zh/topics/interview/`、`/en/topics/` 均返回 200；390/768/1280 无横向溢出；面包屑显示「首页 » 专题 » 面试专题」

## 收尾

- [ ] 4.1 `pnpm build` 全量通过（astro check + astro build + pagefind）
- [ ] 4.2 更新 `docs` 或 `openspec/specs` 中与目录组织相关的说明（如涉及）
- [ ] 4.3 `openspec validate add-content-browse --strict` 通过，实施完成后归档
