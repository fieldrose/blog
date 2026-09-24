---
author: Mimas
pubDatetime: 2024-10-15T09:30:00Z
title: "GitHub Actions 自动部署 Vite 项目到 GitHub Pages 全记录"
slug: github-actions-pages-deploy
featured: false
draft: false
tags:
  - CI/CD
  - Vite
  - GitHub
description: "从手动拖 dist 到 push 即上线：一份可直接抄的 Vite + pnpm + Node 24 工作流，附资源路径、缓存与并发部署的避坑细节。"
---

最早部署静态站点，我是本地 `pnpm build` 之后手动把 `dist` 拖到服务器上，一次半小时起步，还经常漏传文件。配好 GitHub Actions 之后，`git push` 就是发布。这篇记录一份可直接使用的工作流，以及几个不看文档一定会踩的坑。

## Table of contents

## 一、仓库侧的两处设置

工作流之外，GitHub 仓库需要先开两个开关：

1. **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**（否则 workflow 部署会被拒绝）；
2. 仓库建议设为 Public，Private 仓库的 Pages 属于付费额度。

## 二、完整工作流

在仓库根目录新建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy static content to Pages

on:
  push:
    branches: ["main"]
  workflow_dispatch: # 允许在 Actions 页面手动触发

permissions:
  contents: read
  pages: write
  id-token: write

# 同一时间只允许一个部署任务，新推送会顶掉旧任务
concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm run build

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: "./dist"

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

整个流程分三段：**准备环境（checkout + pnpm + Node）→ 构建 → 上传产物并部署**。`actions/deploy-pages` 会把上一步上传的 artifact 发布到 Pages 基础设施，并把最终 URL 通过 `outputs.page_url` 暴露出来。

几个要点解释：

- `--frozen-lockfile` 保证 CI 严格按 `pnpm-lock.yaml` 安装，锁文件与 package.json 不一致时直接失败，杜绝"我本地能跑"；
- `cache: "pnpm"` 让 setup-node 自动按 lockfile 缓存依赖 store；
- `concurrency` 组配合 `cancel-in-progress: true`，连续 push 时旧构建会被取消，不会出现旧版本后上线覆盖新版本的事故。

## 三、最大的坑：资源路径

Pages 的站点 URL 通常是 `https://<user>.github.io/<repo>/`，带一级子路径。Vite 默认以 `/` 为根加载资源，部署后 JS/CSS 全部 404、页面一片空白。

解决方式是在 `vite.config.ts` 里配置 `base`：

```ts
import { defineConfig } from "vite";

export default defineConfig({
  base: "/你的仓库名/",
});
```

使用客户端路由（React Router/Vue Router 的 history 模式）时，还要把 router 的 basename 同步设成仓库名；嫌麻烦可以直接用 hash 模式，或者把站点绑到自定义域名（自定义域名下根路径就是 `/`）。

## 四、SPA 的 404 回退

GitHub Pages 不支持自定义服务端重写规则。纯客户端路由的项目，刷新 `/about` 会命中 404。一个零成本技巧是利用 Pages 的约定：把构建产物里的 `index.html` 复制一份命名为 `404.html`，Pages 找不到文件时会返回它，前端路由就能接管：

```yaml
- name: SPA fallback
  run: cp dist/index.html dist/404.html
```

## 五、这套思路迁移到自有服务器

后来项目迁到自有 Nginx 服务器，流水线的"构建段"完全复用，只把最后两步换成部署步骤：构建产物用 `scp`/`rsync` 推到目标机（密钥通过 GitHub Secrets 注入），再远程 reload 一次 Nginx。配合静态资源强缓存 + HTML 防缓存的策略，一次完整发布从手动时代的 30 分钟压到了 5 分钟以内。

CI/CD 的价值不只是省事：**部署变成了一个可复现、可审计、可回滚（重新部署旧 commit 即可）的流程**，而不是某台电脑上的一段肌肉记忆。
