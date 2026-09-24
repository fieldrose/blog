---
author: Mimas
pubDatetime: 2024-03-12T10:20:00Z
modDatetime: 2024-06-02T09:00:00Z
title: "从 CommonJS 到 ESM：把 Node.js 模块系统彻底讲清楚"
slug: cjs-esm-nodejs-modules
featured: false
draft: false
tags:
  - Node.js
  - JavaScript
description: "require 为什么是同步的、import 为什么能异步加载、node: 前缀解决了什么问题——一篇笔记梳理 CommonJS 与 ESM 的核心差异与迁移要点。"
---

最近把一个老 Node 服务从 CommonJS 迁到 ESM，踩了不少"看起来能跑、实际上语义不同"的坑。这篇文章把两类模块系统的加载机制、互操作规则和迁移清单一次讲清楚。

## Table of contents

## 一、加载时机：同步阻塞 vs 异步连接图

CommonJS 的 `require` 是**同步**的：调用发生时，模块文件被立即读取、执行，然后把 `module.exports` 返回。这也是为什么早期 Node 服务启动时敢在顶层直接读文件、连数据库——一切按顺序发生：

```js
// a.cjs
console.log("a start");
const b = require("./b.cjs"); // b 完整执行完才会往下走
console.log("a end", b);
```

ESM 则完全不同。`import` 是模块的静态声明，JS 引擎在执行任何代码前会先做两步：

1. **解析（parsing）**：扫描 `import`/`export`，构建模块依赖图，这一步不执行代码；
2. **链接（linking）**：把所有 `import` 的绑定指向对应模块的导出；
3. 最后才按深度优先后序执行模块体。

这意味着 ESM 的加载天然是异步的——浏览器可以先把整张依赖图下载完，再统一求值；也意味着 `import` 不能写在 `if` 分支里（静态分析需要看到它）。需要条件加载时用动态导入：

```js
if (needCache) {
  const redis = await import("./redis.js");
}
```

`import()` 返回 Promise，这也是它和 `require` 最直观的体感差异。

## 二、值绑定：拷贝 vs 实时引用

这是最容易埋 bug 的一点。CommonJS 拿到的是导出值的**快照拷贝**：

```js
// counter.cjs
let count = 0;
const inc = () => count++;
module.exports = { count, inc };

// main.cjs
const c = require("./counter.cjs");
c.inc();
console.log(c.count); // 0 —— 数字是原始值拷贝，不会跟着变
```

ESM 导出的是**实时绑定（live binding）**，导入方读到的永远是导出模块里的最新值：

```js
// counter.mjs
export let count = 0;
export const inc = () => count++;

// main.mjs
import { count, inc } from "./counter.mjs";
inc();
console.log(count); // 1 —— 绑定指向同一个变量
```

所以循环依赖在两种系统里的表现也不同：CJS 遇到循环时可能拿到一个**尚未执行完的半初始化 `module.exports`**；ESM 通过实时绑定缓解了这个问题，但访问仍需发生在对方模块求值之后。

## 三、写法对照表

| 场景                       | CommonJS                               | ESM                                              |
| -------------------------- | -------------------------------------- | ------------------------------------------------ |
| 导出                       | `module.exports = x` / `exports.x = x` | `export default x` / `export const x`            |
| 导入                       | `const x = require("x")`               | `import x from "x"`                              |
| JSON                       | `require("./a.json")` 直接可用         | `import a from "./a.json" with { type: "json" }` |
| 目录索引                   | 自动解析 `index.js`                    | 需显式写 `./dir/index.js`                        |
| 顶层 await                 | 不支持                                 | 支持（模块即异步）                               |
| `__dirname` / `__filename` | 内建可用                               | 不存在                                           |

ESM 中要拿当前文件路径，用 `import.meta.url` 自己算：

```js
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

## 四、`node:` 前缀：为什么新代码都该加上

导入内置模块时，推荐显式写 `node:` 协议：

```js
import { createInterface } from "node:readline/promises";
import { readFile } from "node:fs/promises";
```

它解决三件事：

- **语义清晰**：一眼区分内置模块、第三方包和本地文件；
- **加载隔离**：Node 对 `node:` 模块有最高优先级，即使项目里存在同名文件或 npm 包也不会误加载（比如有人手滑建了一个 `events.js`）；
- **未来兼容**：Node 16+ 官方推荐写法，bundler 和类型工具对它的支持也最好。

## 五、迁移清单

实际把项目切到 ESM 时，我按这个顺序走，基本不会翻车：

1. `package.json` 加 `"type": "module"`；不想整体切换的文件直接用 `.cjs` 后缀保留 CJS；
2. 把所有相对路径导入补全扩展名（ESM 不补 `.js` 后缀，Node 不会猜）；
3. 替换 `require` / `module.exports` / `__dirname`；
4. 配置文件（如 `postcss.config.cjs`）这类被工具链以 CJS 加载的文件，用 `.cjs` 后缀隔离；
5. 引入第三方包遇到 `require is not defined`，多半是该包仍是 CJS——Node 提供了默认导入互操作：`import pkg from "cjs-package"` 基本等价于 `const pkg = require("cjs-package")`，但具名导入（`import { x }`）不保证可用，以包的导出为准。

## 小结

CJS 的模型是"执行到哪、读到哪"的同步函数调用，ESM 的模型是"先建图、再链接、后求值"的静态模块系统。理解加载时机和实时绑定这两个根本差异，迁移时遇到的九成问题都能自己推断出原因。新项目没有历史包袱的话，直接 ESM 起步；有老服务要迁，按清单分步走即可。
