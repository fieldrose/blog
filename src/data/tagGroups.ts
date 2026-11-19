/**
 * 标签页的分组配置。
 *
 * 分组只影响 `/tags` 索引页的展示顺序与组标题，不改变 `/tags/[tag]` 路由，
 * 也不改动任何文章的 `tags` 字段。新增标签若未在此登记会自动归入「其他」，
 * 因此不需要为了展示而同步维护全部标签。
 */
export type TagGroupKey = "theme" | "tech";

export type TagGroup = {
  key: TagGroupKey;
  tags: string[];
};

export const tagGroups: TagGroup[] = [
  {
    key: "theme",
    tags: [
      "JavaScript",
      "TypeScript",
      "设计模式",
      "性能优化",
      "性能指标",
      "工程化",
      "架构",
      "网络",
      "算法",
      "数据结构",
      "缓存",
      "操作系统",
      "浏览器",
      "并发",
      "微前端",
      "项目经历",
      "面试",
      "文件组织",
      "渲染",
      "内存",
      "垃圾回收",
      "用户体验",
      "感知性能",
      "资源加载",
      "主线程",
      "前端工程",
      "性能预算",
      "维护",
      "构建",
      "Web Vitals",
      "LCP",
      "INP",
    ],
  },
  {
    key: "tech",
    tags: [
      "Vue3",
      "Vue",
      "React",
      "Vite",
      "Node.js",
      "pnpm",
      "npm",
      "SSR",
      "WebView",
      "Web Worker",
      "Vitest",
      "single-spa",
      "qiankun",
      "Monorepo",
      "Hybrid",
      "Performance API",
      "fetch",
      "TLS",
      "TCP",
      "HTTP",
      "DNS",
      "IO",
      "Markdown",
      "MDX",
      "Docs",
    ],
  },
];
