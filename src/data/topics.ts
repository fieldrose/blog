/**
 * 跨专栏的策展型阅读路径。
 *
 * `items` 通过文章 id（内容集合主键）引用，而不是 slug 或标题：改名或调整
 * 标题时 id 的变更会被构建期校验直接暴露，不会出现静默丢项。渲染前由
 * `resolveTopics` 解析为真实文章。
 *
 * id 由文件名派生并做小写归一，例如 `JS基础.md` 的 id 是 `js基础`，
 * `TCP、TLS与网络链路.md` 保留原大小写为 `TCP、TLS与网络链路`。
 * 新增条目时以构建报错中列出的可用 id 为准。
 *
 * 专题顺序即首页与实际展示顺序，取前 3 个进入首页。
 */
export type TopicItem = {
  /** 文章 id（内容集合主键）。 */
  id: string;
  /** 这一篇在路径中的定位，一句话说明为什么读它。 */
  note?: string;
};

export type Topic = {
  /** 路由参数，英文短标识。 */
  slug: string;
  title: string;
  description: string;
  items: TopicItem[];
};

export const topics: Topic[] = [
  {
    slug: "interview",
    title: "面试专题",
    description:
      "从语言基础到网络与设计原则的一条复习路径，按依赖顺序排列。",
    items: [
      { id: "js基础", note: "原型链与作用域是所有手写题的底子" },
      { id: "闭包和高阶函数", note: "闭包的形成条件与内存影响" },
      { id: "this、call和apply", note: "绑定规则的优先级" },
      { id: "对象与类", note: "new、继承与 this 的执行顺序" },
      { id: "手写new", note: "把原型四步拆开写一遍" },
      { id: "面向对象的javascript", note: "原型模式与封装" },
      { id: "类型全解", note: "unknown 与 any 的边界" },
      { id: "HTTP协议与缓存", note: "强缓存与协商缓存的判定顺序" },
      { id: "TCP、TLS与网络链路", note: "握手次数与 TLS 版本差异" },
    ],
  },
  {
    slug: "performance",
    title: "性能优化全景",
    description:
      "按「先测准、再优化」的顺序串起指标体系、测量方法、各个渲染阶段与一次完整实战。",
    items: [
      { id: "前端性能指标体系", note: "先明确度量线，再谈优化手段" },
      { id: "浏览器环境下的性能测量", note: "PerformanceObserver 的采集口径" },
      { id: "WebView与Hybrid环境下的性能指标", note: "容器与页面是两套时钟" },
      { id: "fcp优化", note: "一次端到端改造的完整链路与指标变化" },
      { id: "加载阶段优化", note: "下载多少、何时下载、能否不下载" },
      { id: "渲染与首屏优化", note: "关键渲染路径与流式渲染" },
      { id: "运行时与交互优化", note: "长任务拆分与 INP" },
      { id: "面向用户体验的性能优化", note: "把指标换算成用户感知" },
    ],
  },
];
