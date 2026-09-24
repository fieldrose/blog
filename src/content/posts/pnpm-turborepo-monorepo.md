---
author: Mimas
pubDatetime: 2025-03-12T11:00:00Z
modDatetime: 2025-05-08T03:30:00Z
title: "pnpm + Turborepo：一个能打的 Monorepo 是怎么搭起来的"
slug: pnpm-turborepo-monorepo
featured: false
draft: false
tags:
  - Monorepo
  - pnpm
  - 工程化
description: "从多仓库的重复依赖地狱，到 pnpm workspace 的硬链接存储与 Turborepo 的任务缓存：一套前后端 Monorepo 的落地结构、依赖声明与缓存配置实录。"
---

团队最初是"每个应用一个仓库"：组件库发 npm 包、主应用升级、另一个 H5 应用再升一遍，一个基础组件改动要发版三次、联调三天。迁到 Monorepo 之后，所有应用和共享包在同一个仓库里，改动即时生效，构建还被缓存大幅加速。这篇讲清楚我们最终的结构：**pnpm workspace 管依赖，Turborepo 管任务**。

## Table of contents

## 一、为什么不自己搞"文件夹 Monorepo"

没有 workspace 工具时，把多个项目放进一个仓库会立刻遇到三个问题：

1. 每个工作区各自一套 `node_modules`，同一个版本的 React 被装几十遍，磁盘和安装时间双爆炸；
2. 包之间互相引用靠 `"xxx": "file:../xxx"`，类型、构建产物路径全靠人肉约定；
3. `lint`、`test`、`build` 要自己写脚本循环调度，依赖顺序写错就是间歇性构建失败。

pnpm 解决前两个，Turborepo 解决第三个。

## 二、pnpm workspace：一个 store，全局硬链接

根目录声明工作区：

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

典型目录：

```text
.
├── apps/
│   ├── web/            # 主站（Vue3 + Vite）
│   └── admin/          # 后台
├── packages/
│   ├── ui/             # 共享组件库
│   ├── tsconfig/       # 共享 TS 配置
│   └── utils/          # 工具函数
├── pnpm-workspace.yaml
├── package.json
└── turbo.json
```

pnpm 的核心机制是**内容寻址 store + 硬链接**：所有包只在全局 store 里存一份实体文件，项目的 `node_modules` 里只是硬链接。10 个工作区都依赖同一个 React，磁盘上也只有一份 React 的实际文件。加上严格的非扁平 `node_modules`，**一个包没有在自己的 package.json 里声明依赖就 import 不到**，幽灵依赖问题天然消失。

包间引用用 `workspace:` 协议：

```jsonc
// apps/web/package.json
{
  "dependencies": {
    "@org/ui": "workspace:*",
    "@org/utils": "workspace:^",
  },
}
```

- `workspace:*`：锁死当前工作区版本，适合内部强绑定；
- `workspace:^`：跟随 minor 范围；
- 发布到 npm 时 pnpm 会自动把 `workspace:` 替换成真实版本号。

常用调度命令：

```bash
pnpm --filter @org/web dev       # 只跑某个应用
pnpm --filter @org/web... build  # ... 包含其所有依赖包，自动按拓扑顺序构建
pnpm -r exec node -v             # 在每个工作区执行命令
```

## 三、Turborepo：让任务图自己跑起来

pnpm 负责"包怎么装"，任务之间的依赖编排与缓存则交给 Turborepo。配置文件：

```jsonc
// turbo.json（turbo 2.x 使用 tasks，旧版叫 pipeline）
{
  "$schema": "https://turbo.software/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"], // 先构建依赖包
      "outputs": ["dist/**"],
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": [],
    },
    "lint": {},
    "dev": {
      "cache": false,
      "persistent": true,
    },
  },
}
```

它做三件关键的事：

1. **拓扑调度**：`build` 声明了 `^build`，Turborepo 会保证 `@org/ui` 构建完才构建 `apps/web`，无依赖关系的任务全部并行；
2. **本地缓存**：任务的输入（源码、环境变量、依赖版本、任务配置）被哈希成 key，命中缓存时直接还原 `outputs`，连构建都不执行。一次冷构建 14 秒，全命中时只要几百毫秒；
3. **远程缓存**：团队共用一个缓存服务（Vercel Remote Cache 或自建），同事或 CI 构建过的产物，其他人直接下载。

缓存要生效，`outputs` 必须准确声明产物目录，同时环境变量也要显式登记，否则缓存内容会悄悄"过期却被复用"：

```jsonc
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"],
      "env": ["VITE_API_BASE", "NODE_ENV"],
    },
  },
}
```

## 四、什么时候该上、什么时候别上

Monorepo 不是银弹。它最适合的场景是：**多个应用共享大量内部包、需要原子提交（一次 commit 同时改接口和调用方）、团队能统一工具链**。如果几个仓库技术栈完全不同、发布节奏独立、归属不同团队，多仓库 + 私有 npm registry 反而更省心。

工具选择上：pnpm workspace 对绝大多数团队已经足够；任务编排 Turborepo 学习成本最低（加一个配置文件即可，不破坏现有结构）；Nx 在分布式任务执行、项目图可视化和插件生态上更强，适合超大规模工作区。不要为工具而工具——**先有多包共享的真实痛点，再让工具去解决它**。
