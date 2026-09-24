import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    // Prefer the canonical URL injected via env (Netlify SITE_URL / PUBLIC_SITE_URL).
    // Falls back to localhost so local builds and CI never produce invalid URLs.
    url: process.env.PUBLIC_SITE_URL ?? "http://localhost:4321/",
    title: "Mimas Blog",
    description: "Mimas 的个人技术博客 —— 前端、框架与工程实践笔记。",
    author: "Mimas",
    profile: "https://satna.ing",
    ogImage: "default-og.jpg",
    lang: "zh",
    timezone: "Asia/Shanghai",
    dir: "ltr",
  },
  posts: {
    perPage: 4,
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
      url: "https://github.com/satnaing/astro-paper/edit/main/",
    },
    search: "pagefind",
    // New dynamic features — enabled incrementally as their modules land.
    auth: true,
    reactions: true,
    analytics: true,
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
