# Mimas Blog

个人技术博客，记录前端、框架与工程实践。

基于 AstroPaper 主题二次开发，使用 Astro 7 静态生成，部署于 Netlify 与 Cloudflare，并提供 Trae 托管镜像。

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

## 部署

```bash
pnpm build              # Netlify 构建（netlify.toml 配置）
pnpm build:cloudflare   # Cloudflare Workers 构建（wrangler.jsonc 配置）
pwsh scripts/trae-deploy.ps1   # Trae 托管站点：构建、打包并上传静态镜像
```

- Netlify 与 Cloudflare 在 `git push` 后自动构建，根路径 `/` → `/zh/` 由各自的重定向规则处理。
- Trae 托管不接仓库，需手动执行 [scripts/trae-deploy.ps1](scripts/trae-deploy.ps1)；脚本会生成新的静态资源版本、构建、打包、为静态服务补上 `/` → 301 `/zh/` 规则并上传。可选参数：`-Title`、`-Description`、`-SiteId`、`-SiteUrl`、`-DeployCli`。
- Trae 站点只托管静态产物，Reactions 等服务端接口仅在 Netlify / Cloudflare 部署中可用。

## 项目文件结构

```text
blog/
├─ src/
│  ├─ assets/             # 构建期处理的静态资源：字体、图标、社交图标
│  ├─ components/         # 全局通用组件
│  │  ├─ react/           # React 岛屿组件（认证弹窗、用户菜单等）
│  │  ├─ vue/             # Vue 岛屿组件（计数器、骨架屏等）
│  │  └─ demo/            # 演示入口与演示卡片组件
│  ├─ content/            # 内容集合
│  │  ├─ posts/           # 文章（中英文共用同一份内容，按主题子目录组织）
│  │  └─ pages/           # 页面内容（关于页等）
│  ├─ data/               # 结构化数据：分类、标签分组、专题
│  ├─ demos/              # 交互演示源码，一个子目录对应一个 demo
│  ├─ i18n/               # 国际化：zh/en 文案字典、类型与格式化
│  ├─ layouts/            # 页面骨架：基础布局与文章布局
│  ├─ lib/                # 业务逻辑
│  │  ├─ auth/            # 客户端认证状态与错误文案
│  │  ├─ query/           # TanStack Query 客户端与数据 Hook
│  │  ├─ server/          # 服务端工具：鉴权、限频、文章与接口校验
│  │  └─ supabase/        # Supabase 客户端（匿名 / 服务端 / 用户态）
│  ├─ pages/              # 路由
│  │  ├─ zh/              # 中文路由薄封装页
│  │  ├─ en/              # 英文路由薄封装页
│  │  ├─ _shared/         # 双语共用的页面实现（列表、详情、归档、专题等）
│  │  └─ api/             # 服务端接口（Reactions BFF、OG 图等）
│  ├─ scripts/            # 浏览器端脚本：主题初始化、Mermaid 渲染与缩放
│  ├─ stores/             # 客户端状态（阅读偏好等）
│  ├─ styles/             # 全局样式、主题变量与排版样式
│  ├─ types/              # 全局 TypeScript 类型（配置、接口、演示）
│  ├─ utils/              # 通用工具函数、文章排序与 markdown transformers
│  ├─ config.ts           # 站点配置聚合与导出
│  ├─ content.config.ts   # 内容集合 schema 与加载器
│  └─ remark-collapse.d.ts# remark-collapse 插件类型声明
├─ cloudflare/            # Cloudflare 部署附加文件（_redirects 等）
├─ openspec/              # OpenSpec 变更规范与工件
├─ public/                # 原样拷入产物根的静态文件（favicon、og 图、Pagefind 索引）
├─ scripts/               # 运维脚本（如 trae-deploy.ps1）
├─ supabase/              # 数据库迁移与本地配置
├─ .github/               # CI 工作流与 issue / PR 模板
├─ .trae/                 # 项目规则、命令与文档生成配置
├─ astro-paper.config.ts  # 站点内容配置（作者、导航、分页、功能开关）
├─ astro.config.ts        # Astro 构建配置（适配器、i18n、字体、实验特性）
├─ netlify.toml           # Netlify 部署与重定向规则
├─ wrangler.jsonc         # Cloudflare Workers 部署配置
├─ Dockerfile / compose.yaml # 容器化自托管
└─ test.ts / test.js      # 临时练习脚本，不参与构建
```

约定：

- `src/pages/zh/`、`src/pages/en/` 只做 locale 包装，通用实现统一放在 `src/pages/_shared/`，新增页面需要同时补齐 zh + en 两个薄封装页。
- `src/i18n/lang/zh.ts` 与 `src/i18n/lang/en.ts` 及 `UIStrings` 类型必须同步维护。
- `public/pagefind/` 与 `dist/` 为构建产物，不要手工修改。

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
