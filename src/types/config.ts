interface SiteConfig {
  /** 站点部署地址，例如 "https://example.com" */
  url: string;
  /** 页头与 meta 标签中展示的博客标题 */
  title: string;
  /** 用于 SEO meta 与 RSS 的简短描述 */
  description: string;
  /** 文章默认作者名 */
  author: string;
  /** 作者主页链接（用于结构化数据） */
  profile?: string;
  /** /public 下的兜底 OG 图片文件名，例如 "og.jpg" */
  ogImage?: string;
  /** HTML lang 属性，默认 "en" */
  lang?: string;
  /** 文章日期使用的 IANA 时区，例如 "Asia/Bangkok" */
  timezone?: string;
  /** 文本方向 */
  dir?: "ltr" | "rtl" | "auto";
  /** Google Search Console 验证 meta 标签的内容值 */
  googleVerification?: string;
}

interface PostsConfig {
  /** 分页列表页每页的文章数 */
  perPage?: number;
  /** 首页展示的文章数 */
  perIndex?: number;
  /**
   * 距 pubDatetime 在该时间窗（毫秒）内的定时文章按已发布处理，
   * 默认 15 分钟。
   */
  scheduledPostMargin?: number;
}

interface FeaturesConfig {
  /** 启用明暗主题切换，默认 true。 */
  lightAndDarkMode?: boolean;
  /**
   * 为每篇文章生成动态 OG 图，并在静态文件 `public/{site.ogImage}`
   * 缺失时提供 `/og.png`。设为 false 时该文件必须存在，
   * 否则默认布局的 OG 图会构建失败。
   */
  dynamicOgImage?: boolean;
  /** 展示 /archives 页面并在导航中挂链接，默认 true。 */
  showArchives?: boolean;
  /** 文章详情页展示返回按钮，默认 true。 */
  showBackButton?: boolean;
  /** 文章详情页展示的「编辑页面」链接。 */
  editPost?:
    | {
        enabled: true;
        /** 编辑链接的基础 URL，例如 GitHub 编辑地址 */
        url: string;
      }
    | { enabled: false };
  /**
   * 搜索方案。基础模板自带 "pagefind"。
   * 设为 false 即完全关闭搜索。
   */
  search?: "pagefind" | false;
  /** Supabase Auth 登录 / 注册 UI，默认 false。 */
  auth?: boolean;
  /** 单篇文章的表情反馈，默认 false。 */
  reactions?: boolean;
  /** RAG AI 助手 island，默认 false（缺少 AI 环境变量时自动关闭）。 */
  aiAssistant?: boolean;
  /** PWA：web manifest 与 service worker，默认 false。 */
  pwa?: boolean;
  /** Vue 3 阅读设置面板（字号 / 行距 / 内容宽度），默认 true。 */
  readingSettings?: boolean;
}

interface SocialLink {
  /**
   * 必须对应 src/assets/icons/socials/ 下的 SVG 文件名，
   * 例如 "github" → src/assets/icons/socials/github.svg
   */
  name: string;
  url: string;
  /**
   * 图标链接的无障碍标签（aria-label、title 属性）。
   * 省略时自动生成，如 "{site.title} on GitHub"、"Send an email to {site.title}"；
   * 默认措辞不合适时再覆盖。
   */
  linkTitle?: string;
}

interface ShareLink {
  /**
   * 必须对应 src/assets/icons/socials/ 下的 SVG 文件名，
   * 例如 "facebook" → src/assets/icons/socials/facebook.svg
   */
  name: string;
  /** 分享的基础 URL，文章链接会作为查询参数追加。 */
  url: string;
  /**
   * 图标链接的无障碍标签（aria-label、title 属性）。
   * 省略时自动生成，如 "Share this post on Facebook"、"Share this post via WhatsApp"；
   * 默认措辞不合适时再覆盖。
   */
  linkTitle?: string;
}

interface AstroPaperConfig {
  site: SiteConfig;
  posts?: PostsConfig;
  features?: FeaturesConfig;
  /** 页头 / 页脚展示的社交主页链接 */
  socials?: SocialLink[];
  /** 文章详情页展示的分享链接 */
  shareLinks?: ShareLink[];
}

type ResolvedSiteConfig = Required<
  Pick<
    SiteConfig,
    | "url"
    | "title"
    | "description"
    | "author"
    | "lang"
    | "timezone"
    | "dir"
    | "ogImage"
  >
> &
  Pick<SiteConfig, "profile" | "googleVerification">;

export interface ResolvedAstroPaperConfig {
  site: ResolvedSiteConfig;
  posts: Required<PostsConfig>;
  features: Required<FeaturesConfig>;
  socials: SocialLink[];
  shareLinks: ShareLink[];
}

/**
 * astro-paper.config.ts 的类型辅助函数。
 * @param config - 配置对象。
 * 提供完整 IntelliSense，且不带来任何运行时开销。
 */
export function defineAstroPaperConfig(
  config: AstroPaperConfig
): AstroPaperConfig {
  return config;
}
