# Design: 内容浏览体系

## 为什么按 A → B → C 排期

三个阶段的价值与成本并不对称：

1. **入口接线**成本最低，只动导航、首页区块与标签页渲染，且立刻让 65 篇已挂在专栏下的文章获得可达路径。
2. **分类轴**需要新路由与 i18n，但不动内容源；它解决的是「没有专栏的 10 篇文章」与「想按知识域浏览」的需求。
3. **专题**依赖前两阶段沉淀的分类与专栏视图，作为跨切面的阅读路径存在，单独做会缺少落点。

每阶段独立可发布，互不阻塞。

## 分类的来源：目录派生而非 frontmatter

候选方案对比：

| 方案 | 成本 | 风险 |
| ---- | ---- | ---- |
| 新增 `category` / `subcategory` frontmatter | 需改 75 个文件，且与目录结构双写 | 双写必然漂移 |
| 复用目录段派生 | 零内容改动 | 分类随目录调整而变 |
| 目录去掉 `_` 前缀并进入 URL | 改动目录名 | 全部文章 URL 变更，破坏外链、RSS、OG、点赞主键 |

选择**目录派生**。理由：目录已经是作者实际的分类习惯（`_基础`、`_学习记录`、`_项目经历-前端项目重构`），双写 frontmatter 只会制造两份真相；而把目录塞进 URL 会破坏既有链接，代价远高于收益。

派生规则实现为纯函数，便于 `/posts` 芯片行与 `/categories` 两处复用：

```ts
// 输入: "_项目经历-前端项目重构/SPA架构重建.md"
// 输出: { category: "项目经历", subcategory: "前端项目重构" }
function parseCategoryFromPath(filePath: string): { category: string; subcategory?: string } {
  const segments = filePath
    .replace(BLOG_PATH, "")
    .split("/")
    .filter(Boolean)
    .slice(0, -1)          // 去掉文件名
    .map(s => s.replace(/^_/, ""));
  const [head, ...rest] = segments;
  if (!head) return { category: "未分类" };
  return { category: head, subcategory: rest.length ? rest.join(" / ") : undefined };
}
```

`_其他` 与根目录文章的区别：前者有一级分类无二级，后者两级都缺，分别落到「其他 / 未分类」，避免两者被合并。

## 分类显示名与排序

目录名为了排序与视觉分隔带了前导 `_`，`_项目经历-前端项目重构` 用 `-` 连接两级，这些都属于命名约定而非展示文案。新增 `src/data/categories.ts` 做展示层映射：

```ts
export const categoryMeta = {
  基础: { description: "语言、网络、数据结构与操作系统的底层笔记", order: 1 },
  学习记录: { description: "按语言与工程方向整理的系统笔记", order: 2 },
  项目经历: { description: "真实项目的重构与迁移复盘", order: 3 },
  其他: { description: "维护记录与杂项", order: 4 },
  未分类: { description: "尚未归入分类的文章", order: 99 },
};
```

未登记的目录回退为目录名本身、排在有 `order` 的项之后，保证新增目录不需要先改配置才能显示。

## 标签分组

54 个标签里，40 个只出现 1–3 次，混合了两类语义：「性能优化」「工程化」是知识域，「Vue3」「Vite」是技术栈。合并语义需要人工判断，自动化会把「Vite」和「构建」错误合并。

因此采用静态分组表 `src/data/tagGroups.ts`：

```ts
export const tagGroups = [
  { name: "主题", tags: ["JavaScript", "TypeScript", "操作系统", "网络", "数据结构", "算法", "性能优化", "工程化", "架构", "设计模式", "微前端", "浏览器", "缓存", "并发"] },
  { name: "技术", tags: ["Vue3", "Vue", "Vite", "Node.js", "pnpm", "SSR", "WebView", "Web Worker", "Vitest", "TLS", "Web Vitals", "Performance API"] },
];
```

仍未命中的标签归入「其他」。分组表只影响标签页的展示顺序与分组标题，`/tags/[tag]` 路由与文章 `tags` 字段完全不变。

## 导航断点与横向容量

导航文案从「文章 / 标签 / 关于」变为「文章 / 专栏 / 标签 / 关于」，加上归档、搜索、主题、语言、阅读设置、用户菜单共 6 个图标按钮。按 `sm`（640px）估算：品牌约 110px，4 个文本链接含内边距约 280px，图标区约 220px，间距约 100px，已接近 640px 上限。

处理方式是把桌面导航的显示断点从 `sm:flex` 调整为 `md:flex`。640–767px 区间回落到移动抽屉，抽屉内入口完整。

实施后按真实渲染实测（Playwright，`header` 内层容器宽度恒为 736px）：

| locale | 品牌 | 导航总宽 | 余量 | 单行高度 |
| ---- | ---- | ---- | ---- | ---- |
| zh | 144px | 478px | 114px | 32px |
| en | 144px | 573px | 19px | 32px |

两个结论修正了原估算：

1. 容器宽度由 `max-w-3xl` 固定为 736px，视口继续变大也不会变宽，因此视口断点无法为导航匀出空间，只能靠压缩间距或减少条目。
2. 初始 `gap-x-4` 下英文导航在 736px 内溢出 28px、换行到 50px 高。已改为 `md:gap-x-2`，中英文均恢复单行。

这意味着**阶段二不能直接给桌面导航追加第 5 个文本链接**：英文下「Categories」约 100px，超出 19px 余量。

已定方案：**把「分类」做成文件夹图标并入图标区，同时把「归档」图标移入抽屉**。宽度净增约 0，中英文都不会溢出；代价是桌面端少一个归档入口，但抽屉、`/archives` 路由与面包屑均保留。移动抽屉内「分类」与「归档」两个入口都保留，不受此限制。


## 专题的数据形状

专题条目按文章 id（即相对 `src/content/posts` 的路径）引用，而非 slug 或标题：

```ts
export const topics = [
  {
    slug: "interview",
    title: "面试专题",
    description: "从语言基础到工程实践的面试准备路径",
    items: [
      { id: "_学习记录/_JavaScript/JS基础", note: "先把原型与作用域过一遍" },
      { id: "_学习记录/_设计模式/单例模式" },
    ],
  },
];
```

选 id 而非 slug：id 是内容集合的主键，slug 与文件名调整时 id 的变更更容易被 `astro check` 的内容校验捕获；渲染时通过 `getCollection` 建索引，找不到的 id 在构建期报错而不是静默丢项。

## 渲染与分页

`/categories/[category]` 在单页内按二级分类分组渲染，不再拆二级路由。理由：二级分类当前最多 8 个（`_学习记录` 下），单页可承载；拆路由会产生 12 个以上页面 × 2 语言，收益低于维护成本。若某二级分类超过 20 篇再考虑拆分。

`/topics/[slug]` 不做分页，专题是策展型列表，按声明顺序完整呈现。
