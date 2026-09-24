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
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { transformerFileName } from "./src/utils/transformers/fileName";
import config from "./astro-paper.config";
import { localeCodes } from "./src/i18n/locales";

import vue from "@astrojs/vue";
import react from "@astrojs/react";
import netlify from "@astrojs/netlify";

export default defineConfig({
  site: config.site.url,
  adapter: netlify(),
  integrations: [
    mdx(),
    sitemap({
      filter: page =>
        config.features?.showArchives !== false || !page.endsWith("/archives/"),
    }),
    vue({
      // Installs Pinia-independent Vue plugins (VueQueryPlugin) on every island app.
      appEntrypoint: "/src/pages/_app",
    }),
    react(),
  ],
  i18n: {
    locales: localeCodes,
    defaultLocale: "zh",
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: true,
    },
  },
  markdown: {
    processor: unified({
      remarkPlugins: [
        remarkToc,
        [remarkCollapse, { test: "Table of contents" }],
      ],
      rehypePlugins: [rehypeCallouts],
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
    plugins: [tailwindcss()],
  },
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
      // Canonical site URL; also the base for OAuth/email redirects.
      PUBLIC_SITE_URL: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      // Supabase — public values (RLS is the security boundary).
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
      // Supabase — server-only secret.
      SUPABASE_SERVICE_ROLE_KEY: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
      // AI provider (OpenAI-compatible) — server-only, all optional.
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
  experimental: {
    svgOptimizer: svgoOptimizer(),
  },
});
