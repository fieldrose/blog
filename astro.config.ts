import {
  defineConfig,
  envField,
  fontProviders,
  svgoOptimizer,
} from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { unified } from "@astrojs/markdown-remark";
import remarkToc from "remark-toc";
import remarkCollapse from "remark-collapse";
import rehypeCallouts from "rehype-callouts";
import rehypeMermaid from "rehype-mermaid";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { transformerFileName } from "./src/utils/transformers/fileName";
import { postMetaPlugin } from "./src/utils/postMetaPlugin";
import config from "./astro-paper.config";
import { localeCodes } from "./src/i18n/locales";

import vue from "@astrojs/vue";
import react from "@astrojs/react";
import netlify from "@astrojs/netlify";
import cloudflare from "@astrojs/cloudflare";
import basicSsl from "@vitejs/plugin-basic-ssl";

const USE_SSL = process.env.DEV_SSL === "true";
const USE_CLOUDFLARE = process.env.ASTRO_ADAPTER === "cloudflare";
// 仅在把浏览器资源挂载到带版本前缀的静态主机上设置。
const ASSETS_PREFIX = process.env.PUBLIC_ASSET_PREFIX;

export default defineConfig({
  site: config.site.url,
  adapter: USE_CLOUDFLARE
    ? cloudflare({
        imageService: "compile",
        prerenderEnvironment: "node",
      })
    : netlify({
        // Netlify 部署保留 Netlify 图像 CDN；纯静态构建必须输出真实图片文件，
        // 而不是 `/.netlify/images` 形式的 URL。
        ...(ASSETS_PREFIX ? { imageCDN: false } : {}),
        devFeatures: {
          images: true,
          environmentVariables: false,
          edgeFunctions: false,
        },
      }),
  ...(USE_CLOUDFLARE ? { session: false } : {}),
  ...(ASSETS_PREFIX ? { build: { assetsPrefix: ASSETS_PREFIX } } : {}),
  integrations: [
    mdx(),
    sitemap({
      filter: page =>
        config.features?.showArchives !== false || !page.endsWith("/archives/"),
    }),
    vue({
      // 在每个 island 应用上安装与 Pinia 解耦的 Vue 插件（VueQueryPlugin）。
      appEntrypoint: "/src/pages/_app",
    }),
    react(),
  ],
  // 双语路由：默认语言为 zh，且默认语言同样带前缀（/zh/）。
  i18n: {
    locales: localeCodes,
    defaultLocale: "zh",
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: true,
    },
  },
  markdown: {
    syntaxHighlight: {
      type: "shiki",
      excludeLangs: ["mermaid"],
    },
    processor: unified({
      remarkPlugins: [
        remarkToc,
        [remarkCollapse, { test: "Table of contents" }],
      ],
      rehypePlugins: [
        rehypeCallouts,
        [
          rehypeMermaid,
          {
            // Mermaid 图表在浏览器端渲染。构建期渲染依赖 Playwright 的 Chromium，
            // 而 CI 构建镜像（Cloudflare Workers Builds、Netlify）并不提供该依赖。
            // Astro 的 content loader 只会记录该失败并存入空正文，
            // 导致已发布文章出现空白内容。`pre-mermaid` 将图表源码保留在 HTML 中，
            // 交由客户端渲染（见 src/scripts/mermaid.ts）。
            strategy: "pre-mermaid",
          },
        ],
      ],
    }),
    shikiConfig: {
      themes: { light: "min-light", dark: "night-owl" },
      defaultColor: false,
      wrap: false,
      transformers: [
        transformerFileName({ style: "v2", hideDot: false }),
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
        transformerNotationDiff({ matchAlgorithm: "v3" }),
      ],
    },
  },
  vite: {
    plugins: [
      tailwindcss(),
      postMetaPlugin(),
      ...(USE_SSL ? [basicSsl()] : []),
    ],
    // 强制 Vite 预打包 @pagefind/default-ui，使 search.astro 中动态的
    // `await import("@pagefind/default-ui")` 在开发时能够解析。
    // 否则 Vite 扫描器会漏掉 Astro <script> 内的动态导入，
    // 打开搜索页时开发服务器返回 504。
    optimizeDeps: {
      include: ["@pagefind/default-ui"],
    },
  },
  // 本地字体：JetBrains Mono 由本地 woff2/ttf 提供，避免运行时请求外部字体 CDN。
  fonts: [
    {
      name: "JetBrains Mono",
      cssVariable: "--font-google-sans-code",
      provider: fontProviders.local(),
      fallbacks: ["monospace"],
      options: {
        variants: [
          {
            src: [
              "./src/assets/fonts/jetbrains-mono-latin-400-normal.woff2",
              "./src/assets/fonts/JetBrainsMono-Regular.ttf",
            ],
            weight: 400,
            style: "normal",
          },
          {
            src: [
              "./src/assets/fonts/jetbrains-mono-latin-700-normal.woff2",
              "./src/assets/fonts/JetBrainsMono-Bold.ttf",
            ],
            weight: 700,
            style: "normal",
          },
        ],
      },
    },
  ],
  env: {
    schema: {
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      // 站点规范 URL，同时作为 OAuth / 邮件重定向的基础地址。
      PUBLIC_SITE_URL: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      // Supabase 公开配置（安全边界由 RLS 承担）。
      PUBLIC_SUPABASE_URL: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_SUPABASE_ANON_KEY: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      // Supabase 仅服务端使用的密钥。
      SUPABASE_SERVICE_ROLE_KEY: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
      // AI 提供方（兼容 OpenAI 接口），仅服务端使用，均为可选项。
      AI_API_BASE_URL: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
      AI_API_KEY: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
      AI_CHAT_MODEL: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
      AI_EMBEDDING_MODEL: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
      AI_EMBEDDING_DIM: envField.number({
        access: "secret",
        context: "server",
        optional: true,
      }),
    },
  },
  // 构建期使用 svgo 优化内联 SVG。
  experimental: {
    svgOptimizer: svgoOptimizer(),
  },
});
