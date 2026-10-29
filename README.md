# Mimas Blog

个人技术博客，记录前端、框架与工程实践。

基于 [AstroPaper](https://github.com/satnaing/astro-paper) 主题二次开发，使用 Astro 7 静态生成，部署于 Netlify。

## 技术栈

- Astro 7 + Vite + TypeScript
- Tailwind CSS v4（CSS 变量 token）
- Vue 3 / React 岛屿组件
- Pagefind 静态搜索
- Supabase（认证、评论、偏好同步）与 Netlify Functions（BFF）

## 本地开发

```bash
pnpm install
pnpm dev
```

其他命令：

```bash
pnpm build    # astro check + 构建 + 生成搜索索引
pnpm preview  # 预览构建产物
pnpm lint     # ESLint
pnpm format   # Prettier
```

## 内容与路由

- 文章：`src/content/posts/`（zh/en 共用同一份内容）
- 页面：`src/content/pages/`
- 路由：`src/pages/zh/`、`src/pages/en/` 为语言包装器，通用逻辑在 `src/pages/_shared/`
- 文案：`src/i18n/lang/zh.ts` 与 `src/i18n/lang/en.ts` 需同步维护
- 站点配置：`astro-paper.config.ts`

## 环境变量

复制 `.env.example` 为 `.env.local` 并填写实际值；`PUBLIC_SITE_URL` 用于生成 canonical、sitemap、RSS 与 OG 图。服务端密钥仅在 Netlify 环境变量中配置。

## 规范

项目使用 OpenSpec 管理需求变更，变更工件位于 `openspec/changes/`。详见 [AGENTS.md](AGENTS.md)。

## License

MIT
