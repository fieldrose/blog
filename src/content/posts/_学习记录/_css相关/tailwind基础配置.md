---
author: Mimas
pubDatetime: 2026-11-09T00:00:00Z
modDatetime: 2026-11-18T00:00:00Z
title: "tailwind基础配置"
slug: tailwind基础配置
featured: false
draft: false
tags:
  - tailwind
series: css相关
seriesOrder: 1
description: "tailwind基础"
---

## Table of contents

工具优先的css框架，在构建生产环境时会自动移除所有未使用的css。

### 安装

在vite环境中，tailwind的支持度较高，直接安装tailwind和相关的vite插件后，在vite.config.ts中引入即可。

```bash
npm install tailwindcss @tailwindcss/vite
```

```ts
// vite.config.ts
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
});
```

需要在css文件中显式引入tailwindcss，否则不会生效。

```css
@import "tailwindcss";
```

### 格式化插件

结合prettier，可以自动格式化tailwindcss代码。官方推荐的有prettier-plugin-tailwindcss插件（用于格式化tailwindcss类名顺序）。

```bash
pnpm install -D prettier prettier-plugin-tailwindcss
```

```ignore
// .prettierrc
{
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

### 兼容性
