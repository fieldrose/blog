import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    // 优先使用环境变量注入的规范 URL（Netlify SITE_URL 或 PUBLIC_SITE_URL），
    // 回退到 localhost，避免本地构建与 CI 产生无效 URL。
    url: process.env.PUBLIC_SITE_URL ?? "https://localhost:4321/",
    title: "Mimas Blog",
    description: "Mimas 的个人技术博客 —— 前端、框架与工程实践笔记。",
    author: "Mimas",
    profile: "https://github.com/fieldrose",
    lang: "zh",
    timezone: "Asia/Shanghai",
    dir: "ltr",
  },
  // 文章列表分页，以及定时发布的前置余量（15 分钟内不视为已发布）。
  posts: {
    perPage: 10,
    perIndex: 4,
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: true,
    showArchives: true,
    showBackButton: true,
    editPost: {
      enabled: true,
      url: "https://github.com/fieldrose/blog/edit/main/",
    },
    search: "pagefind",
    // 新增的动态能力，随对应模块落地逐步启用。
    auth: true,
    reactions: true,
    aiAssistant: true,
    pwa: false,
    readingSettings: true,
  },
  socials: [
    { name: "github",   url: "https://github.com/fieldrose" },
  ],
  shareLinks: [
    { name: "mail",     url: "mailto:?subject=See%20this%20post&body=" },
  ],
});
