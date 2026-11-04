---
author: Mimas
pubDatetime: 2026-10-29T02:00:00Z
modDatetime: 2026-10-29T02:00:00Z
title: "存量集成与灰度发布：iframe、多入口与回滚"
slug: 存量集成与灰度发布：iframe、多入口与回滚
featured: false
draft: false
tags:
  - Vue3
  - Vite
  - 项目经历
series: 项目经历-前端项目重构
seriesOrder: 4
description: "180 个异构业务以 URL 为边界集成的现实约束下，保留 iframe 并解决高度自适应、以 Vite 多入口对外提供 URL、以双路径部署与管理端切流量完成灰度与回滚。"
---

## Table of contents

本文是《[渐进式重构：存量前端项目的双轨迁移](/zh/posts/渐进式重构：存量前端项目的双轨迁移/)》的第四篇，对应总览中的「存量共存」层面。

存量共存有两层含义：一是新页面要装得下旧系统，二是新版要和旧版同时在线、随时可退。前者决定集成形态，后者决定发布形态，两者共用同一组约束——存量系统不可控、改造面不能扩大。

## 一、存量业务集成策略

**背景**

约 180 个外接业务以 URL 为边界，多为异构系统，大量以 iframe 内嵌；iframe 与宿主页通过 `window.parent` 直接通信，无统一协议，耦合且分散。

**目标**

明确新业务与存量业务的集成边界，控制改造范围与成本。新项目中，iframe 的集成需要自适应高度以避免滚动条问题，并与父页面的视觉效果保持一致。

**结果**

- 否决微前端：评估 qiankun 与 SystemJS，二者均要求对子应用做侵入式改造（HTML Entry、构建产物格式等）；在存量系统不可控、改造面过大的前提下成本不可行。
- 结论：保留 iframe 作为存量集成手段；新业务在 SPA 内以 vue-router 站内切换实现类原生过渡，老业务通过客户端方法打开新 tab 并指定 URL。
- 一致性：所有跨域（接口与 iframe）由后端转发收敛为同源，规避跨域与鉴权问题；iframe 高度自适应统一由父页面接管——同源下直接观察内部 document（MutationObserver + ResizeObserver，必要时按需轮询兜底），跨域场景才需子页面 `postMessage` 上报。
- 边界：新版接管入口、角色、卡片渲染与新增业务，存量异构系统继续以 URL 为边界集成。

## 二、iframe 高度自适应

**背景**

新项目中需要集成老业务，代码量较大，且分散在不同系统，无法做微前端改造。依旧选用 iframe 作为主要的集成手段。

**目标**

新项目中使用 iframe 集成的内容粒度更细，例如组件级集成，原有的页面级集成部分保留。且组件级集成需要父页面 iframe 元素根据加载内容自适应宽高（此处宽度一般固定为 100%，高度根据内容自适应），以保证和新项目一致的视觉效果。

**结果**

iframe 高度自适应是集成的经典问题，解决方案一般分为同源和跨域两个部分。新项目中所有 iframe 都是同源的（由后端转发收敛为同源），父页面可直接读取 `contentDocument` 操作内部 DOM。

对于同源 iframe 集成，`MutationObserver`（Chrome 18 / IE 11 起）覆盖 DOM 结构变化；`ResizeObserver`（Chrome 64 / Safari 13.1 起，低于项目 targets）覆盖尺寸变化，已通过 legacy 插件注入 polyfill。两者均无法感知 `overflow: hidden` 等导致的 border box 与 `scrollHeight` 不一致，由按需轮询兜底。

对于跨域 iframe 集成，一般只能通过子页面 postMessage 主动上报内容高度，父页面监听消息，实时更新 iframe 高度。

最终使用 MutationObserver + ResizeObserver + 轮询兜底的组合，实现 iframe 高度自适应。

核心逻辑抽离为独立工具函数，Vue 组件只负责生命周期管理和 props 透传：

```ts
// utils/iframeResize.ts
interface ResizeOptions {
  enablePolling?: boolean; // 是否开启轮询兜底（body 有 overflow 的存量页面开）
  pollingInterval?: number; // 轮询间隔 ms，默认 2000
  onHeightChange?: (h: number) => void;
}

/**
 * 同源 iframe 高度自适应。父页面直接操作 iframe.contentDocument，无需子页面配合。
 * ResizeObserver 覆盖尺寸变化（图片/字体/CSS 过渡）；
 * MutationObserver 覆盖 DOM 变化（JS 渲染列表、SPA 路由切换）；
 * 轮询兜底仅在 enablePolling=true 时开启，用于 body overflow 导致 border box 与 scrollHeight 不一致的场景。
 * 返回 cleanup，组件卸载时调用。
 */
export function setupIframeAutoResize(
  iframe: HTMLIFrameElement,
  options: ResizeOptions = {}
): () => void {
  const {
    // 只对指定 iframe 开启轮询兜底，默认不开启，以节省低版本浏览器的性能
    enablePolling = false,
    pollingInterval = 2000,
    onHeightChange,
  } = options;
  let lastHeight = 0;
  let mo: MutationObserver | null = null;
  let ro: ResizeObserver | null = null;
  let timer: number | null = null;

  const update = () => {
    const doc = iframe.contentDocument;
    if (!doc) return;
    const h = doc.documentElement.scrollHeight;
    if (h !== lastHeight) {
      lastHeight = h;
      iframe.style.height = h + "px";
      onHeightChange?.(h);
    }
  };

  const cleanup = () => {
    mo?.disconnect();
    ro?.disconnect();
    if (timer) clearInterval(timer);
  };

  iframe.addEventListener("load", () => {
    const doc = iframe.contentDocument;
    if (!doc) return;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(update);
      ro.observe(doc.body);
    }
    mo = new MutationObserver(update);
    mo.observe(doc.body, { childList: true, subtree: true });
    if (enablePolling) timer = window.setInterval(update, pollingInterval);
    update();
  });

  return cleanup;
}
```

Vue 组件封装，按需开启轮询：

```vue
<!-- 通用 iframe 组件 IframeBox.vue -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { setupIframeAutoResize } from "@/utils/iframeResize";

const props = defineProps<{
  src: string;
  enablePolling?: boolean;
  pollingInterval?: number;
}>();

const iframeRef = ref<HTMLIFrameElement | null>(null);
let cleanup: (() => void) | null = null;

onMounted(() => {
  if (iframeRef.value) {
    cleanup = setupIframeAutoResize(iframeRef.value, {
      enablePolling: props.enablePolling,
      pollingInterval: props.pollingInterval,
    });
  }
});

onUnmounted(() => cleanup?.());
</script>

<template>
  <iframe
    ref="iframeRef"
    :src="src"
    frameborder="0"
    style="width: 100%; height: 0"
  />
</template>
```

```vue
<!-- 业务模块使用：新页面不开轮询；存量页面不可控时兜底 -->
<IframeBox src="/new/dashboard" />
<IframeBox src="/old/legacy" :enable-polling="true" />
```

**补充说明**

iframe 高度自适应属于经典问题，有较为成熟的第三方解决方案，如 [iframe-resizer](https://iframe-resizer.com/) 等。

因项目场景为同源 iframe 集成，仅需高度自适应。不需要过多的边界处理（例如：打印模式、iOS Safari 弹性滚动、字体闪烁、SPA hash 路由等），且第三方组件较重。故选择手动实现。

## 三、对外集成：URL 形态的多入口方案

**背景**

主应用采用 vue-router 的 memory 模式，页面层级由路由栈管理，深层页面没有对应 URL；而公司层面对外集成统一要求提供 URL，由各宿主系统以 iframe 嵌入。宿主技术栈异构——jQuery、Vue2、React 并存，集成形态需对栈零假设。

**形态对比**

| 维度       | URL / iframe                | SDK / 组件包                   |
| :--------- | :-------------------------- | :----------------------------- |
| 技术栈耦合 | 零，宿主只需 iframe 标签    | 高，产物需适配各宿主栈         |
| 隔离性     | 样式与 JS 运行时完全隔离    | 同一运行时，样式与全局状态互扰 |
| 部署耦合   | 独立发版，宿主零改动        | 升级需各宿主同步发版           |
| 交互深度   | 受限于 postMessage          | 直接函数调用与事件             |
| 会话与状态 | 独立上下文，凭证经 URL 传递 | 共享宿主上下文                 |

宿主异构且不可控，URL 是栈零耦合与独立发版下的必然选择，代价是交互深度受限、凭证传递依赖 URL。

**落地**

Vite 多入口构建实现独立集成页：每个入口为薄壳，复用 SPA 的业务组件与接口层，独立挂载运行。实例页面为用户所属业务网格的营销情况与改进建议。凭证链路：

1. 集成方调用我方后端接口换取 token；
2. token 拼接在集成 URL 传给页面；
3. 页面以 token 调用户信息查询接口，再以返回的用户信息请求业务数据。

```ts
// vite.config.ts（示意）：多入口，主应用与集成页各自产出独立 HTML
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        grid: fileURLToPath(new URL("./grid.html", import.meta.url)),
      },
    },
  },
});
```

```html
<!-- grid.html（示意）：集成页的独立薄壳，与主应用共享同一 bundle 依赖图 -->
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>网格营销</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/entries/grid.ts"></script>
  </body>
</html>
```

```ts
// src/entries/grid.ts（当时的写法：启动序列在各入口各自实现）
import { createApp } from "vue";
import GridPage from "@/pages/GridPage.vue";
import { fetchUserInfo } from "@/api/user";
import { parseToken } from "@/lib/parseToken";
import { globalState } from "@/stores/global";

const token = parseToken(location.search);
if (token) {
  const user = await fetchUserInfo(token);
  globalState.value = { token, user };
  createApp(GridPage).mount("#app");
}
```

**局限与演进**

- 业务逻辑经 hooks 拆分后，集成页可直接复用视图组件与 hooks，重复实现的只剩装配层：重新引入并初始化全局状态对象（global.js，hooks 与业务模块从其中取值），「取 URL token → 初始化 → 挂载」的启动序列在每个入口重演，且 hooks 读取全局单例的时序是隐式契约——可收敛为共享 bootstrap （自举）模块，入口薄壳只负责调用与挂载；
- URL 形态的交互受限于 postMessage，若宿主可控且交互密集，SDK 形态的自然实现是 Web Components：产物与宿主栈解耦，同时支持属性传参与事件。

收敛形态如下（**演进方向示意，当时未落地**）：协议层下沉到骨架，页面通过参数传入，入口差异经钩子或返回实例续接。

```ts
// src/bootstrap.ts（演进方向示意）
import { createApp, type Component } from "vue";
import { fetchUserInfo } from "@/api/user";
import { parseToken } from "@/lib/parseToken";
import { globalState } from "@/stores/global";

interface BootstrapOptions {
  /** 入口特有的装配，时序由骨架保证 */
  beforeMount?: (app: ReturnType<typeof createApp>) => void | Promise<void>;
}

export async function bootstrap(
  page: Component,
  options: BootstrapOptions = {}
) {
  // 协议层：token 解析与鉴权兜底，各入口一致
  const token = parseToken(location.search);
  if (!token) {
    document.body.innerHTML = "<p>缺少访问凭证</p>";
    return;
  }

  const user = await fetchUserInfo(token);
  // 整体替换而非逐字段赋值，避免残留上一次会话
  globalState.value = { token, user };

  const app = createApp(page);
  await options.beforeMount?.(app);
  app.mount("#app");

  // 返回实例：装配差异较大的入口可继续 use / mount
  return app;
}
```

```ts
// src/entries/grid.ts（收敛后）
import { bootstrap } from "@/bootstrap";
import GridPage from "@/pages/GridPage.vue";

bootstrap(GridPage);
```

入口薄壳退化为一行调用，启动序列与 hooks 的时序依赖被封在骨架内部。

## 四、灰度发布与双轨部署

**背景**

新旧两套前端并存，登录入口由客户端发起、后端返回首页地址决定。发布链路受网络环境限制，无 CI，采用零信任客户端接入 + SFTP 逐台替换 8 台主机的对应目录（`/oneapp` 与 `/newoneapp` 分目录存放）。

**目标**

在不中断业务、可随时回滚的前提下完成放量切换。

**结果**

- 落地：新旧版本位于同域名不同路径，生产环境同时部署；管理端按角色调整登录接口返回的首页地址即可完成切换与回滚，无需前端发版。
- 节奏：先以测试白名单放量，再按角色分批放开（管理类角色优先，逐步扩展至一线角色），最终全量切换。
- 代价：放量期间新功能需双轨实现——新版以 Vue 开发，旧版仍需手写 ES5；发布为纯手工流程，且构建产物哈希变化需逐次登记暴露面白名单（后以自研 Vite 插件自动化，见《[双轨迁移的工程化配套实践](/zh/posts/双轨迁移的工程化配套实践/)》）。

## 小结

存量共存的难点不在于技术选型，而在于把「改不动」的部分固定下来：存量系统改不动，所以用 iframe 而不是微前端；对外宿主改不动，所以给 URL 而不是 SDK；旧版业务改不动，所以用登录地址切换而不是灰度网关。所有方案都绕着同一个前提设计，这也让回滚的成本降到了改一个接口返回值。
