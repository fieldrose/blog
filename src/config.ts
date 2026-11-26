/**
 * 全站使用的内部已解析配置。
 *
 * 修改配置请优先编辑 `astro-paper.config.ts`；本模块只负责补齐默认值，
 * 并对外暴露完整解析后的配置形状（`ResolvedAstroPaperConfig`）。
 */
import userConfig from "@/astro-paper.config";
import type { ResolvedAstroPaperConfig } from "./types/config";
import { PUBLIC_GOOGLE_SITE_VERIFICATION } from "astro:env/client";

/** 未配置 ogImage 时使用的默认文件名 */
const DEFAULT_OG_IMAGE = "og.png";

const config: ResolvedAstroPaperConfig = {
  site: {
    ...userConfig.site,
    ogImage: userConfig.site.ogImage ?? DEFAULT_OG_IMAGE,
    lang: userConfig.site.lang ?? "en",
    timezone: userConfig.site.timezone ?? "UTC",
    dir: userConfig.site.dir ?? "ltr",
    googleVerification:
      userConfig.site.googleVerification || PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
  posts: {
    perPage: userConfig.posts?.perPage ?? 10,
    perIndex: userConfig.posts?.perIndex ?? 4,
    scheduledPostMargin:
      userConfig.posts?.scheduledPostMargin ?? 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: userConfig.features?.lightAndDarkMode ?? true,
    dynamicOgImage: userConfig.features?.dynamicOgImage ?? true,
    showArchives: userConfig.features?.showArchives ?? true,
    showBackButton: userConfig.features?.showBackButton ?? true,
    editPost: userConfig.features?.editPost ?? { enabled: false },
    search: userConfig.features?.search ?? "pagefind",
    auth: userConfig.features?.auth ?? false,
    reactions: userConfig.features?.reactions ?? false,
    aiAssistant: userConfig.features?.aiAssistant ?? false,
    pwa: userConfig.features?.pwa ?? false,
    readingSettings: userConfig.features?.readingSettings ?? true,
  },
  socials: userConfig.socials ?? [],
  shareLinks: userConfig.shareLinks ?? [],
};

export default config;
