---
author: Mimas
pubDatetime: 2026-01-16T13:10:00Z
title: "让现代代码跑在 Android 6 / iOS 10 上：Vite 遗留浏览器兼容实战"
slug: vite-legacy-old-mobile-browsers
featured: false
draft: false
tags:
  - Vite
  - 兼容性
  - 性能
description: "装维 PDA 还停留在 Android 6 WebView、用户手机是 iOS 10——@vitejs/plugin-legacy 是怎么生成双端包的？browserslist、Polyfill 按需注入、SystemJS 降级与 PostCSS 前缀全流程记录。"
---

系统的用户里有一批装维人员，手持 PDA 运行的是 Android 6 的老 WebView，也有少量 iOS 10 设备。Vite 默认只支持原生 ESM 的现代浏览器，在这些机器上页面直接白屏。这篇记录用 `@vitejs/plugin-legacy` 做兼容的完整方案，以及"白屏 → 功能性问题 → 样式错位"三类故障的排查路径。

## Table of contents

## 一、现代浏览器为什么直接白屏

Vite 的产物基于三个老浏览器都没有的能力：

- 原生 `<script type="module">`（iOS 10.3 以下、Android 6 WebView 均不支持）；
- `import()` 动态导入（代码分割的懒加载 chunk 全靠它）；
- `async/await`、可选链、`Promise.allSettled` 等新语法/API。

不支持 ESM 的浏览器连入口脚本都不会执行，表现就是 HTML 加载了、页面空白、控制台报语法错误。

## 二、@vitejs/plugin-legacy 的双端包机制

插件的思路非常直接：**一次构建，产出两套代码 + 一段分流代码**。

```ts
// vite.config.ts
import legacy from "@vitejs/plugin-legacy";

export default defineConfig({
  plugins: [
    vue(),
    legacy({
      // 需要兼容的浏览器范围
      targets: ["Android >= 6", "iOS >= 10", "Chrome >= 49"],
      // 为这些目标额外注入 Polyfill
      additionalLegacyPolyfills: ["regenerator-runtime/runtime"],
      renderLegacyChunks: true,
    }),
  ],
});
```

构建后 HTML 里会同时出现两类脚本：

```html
<!-- 现代浏览器：nomodule 让老浏览器忽略它 -->
<script type="module" crossorigin src="/assets/index.a1b2.mjs"></script>

<!-- 老浏览器：SystemJS 格式的 legacy 包，module 浏览器忽略它 -->
<script nomodule src="/assets/legacy-polyfills.legacy.js"></script>
<script nomodule>
  System.import("/assets/index.legacy.js");
</script>
```

浏览器天生按 `type="module"` / `nomodule` 互斥地选择执行哪一套，**现代用户不会多下载一个字节的 Polyfill**。legacy 包通过 SystemJS 抹平了模块加载和动态导入的差异，这一点恰好和我们微前端体系里的运行时一致。

## 三、browserslist：语法转译与 API Polyfill 的共同输入

兼容目标不要只写在插件配置里，统一交给 browserslist 管理，Babel（语法降级）、Autoprefixer（CSS 前缀）、core-js（API Polyfill）都会读取它：

```ini
# .browserslistrc
[production]
Android >= 6
iOS >= 10
Chrome >= 49

[development]
last 1 chrome version
last 1 safari version
```

注意区分两类东西：

- **语法**（箭头函数、解构、class）：Babel 自动转译，不需要 Polyfill；
- **API**（`Promise`、`fetch`、`Array.prototype.includes`、`URL`、`IntersectionObserver`）：必须注入 Polyfill。

插件会根据代码中实际用到的 API 做**按需 Polyfill 打包**，而不是无脑引完整 core-js。`fetch` 这种 web API 不在 core-js 范围内，需要单独引入 `whatwg-fetch`；`IntersectionObserver` 等新观察器则在用到的组件里动态加载对应 Polyfill，避免污染全局包体。

## 四、样式层：PostCSS 与 Flexbox 降级

JS 能跑之后，老设备上开始出现"布局错位"。两类原因：

1. **属性缺前缀**：iOS 10 的 Safari 对 Flexbox、sticky、transition 还需要 `-webkit-` 前缀。Autoprefixer 读 browserslist 自动补齐，无需手写；
2. **Flexbox 老语法差异**：iOS 9–10 对 `flex: 1` 的收缩计算与现代浏览器不一致，需要避免依赖 `flex-basis: auto` 的隐式行为，关键容器显式写明 `flex: 1 1 0%`，最小高度场景加 `-webkit-box` 兜底或改用 grid/table 布局。

```postcss
/* postcss.config.cjs —— 输出前缀的目标同样来自 browserslist */
module.exports = {
  plugins: {
    autoprefixer: {},
  },
};
```

另外老 WebView 对 `100vh`（地址栏不收缩）、`position: sticky`、`:root` CSS 变量的支持都有坑：CSS 变量在 Android 6 WebView 完全不支持，关键主题色用静态值兜底或构建期替换；视口高度统一用 JS 测量 `innerHeight` 写 CSS 自定义属性的静态降级。

## 五、验证方式与体积权衡

光靠模拟器不够，我们搭了真机回归清单：

- Android 6：Chrome 49 内核的真机/PDA，验证登录、列表滚动、拍照上传（PDA 核心场景）；
- iOS 10：Sauce Labs 云真机验证 Safari 与 WKWebView；
- 每次发布前用 `npx browserslist` 确认目标列表没有被依赖升级意外改动。

体积上，legacy 包比现代包大约 20%–30%，但它只发给老设备；更值得关注的是**现代包的体积不能为了兼容而整体膨胀**，所以一切 Polyfill 都走按需路径。上线后观察老版本设备的 JS 错误率，最终降到了零，白屏投诉消失。

兼容工作的原则只有一条：**让老设备拿到能用的兜底，让现代设备不为历史包袱付出代价**。双端包 + browserslist 驱动的工具链恰好把这两件事同时做到了。
