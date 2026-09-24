---
author: Mimas
pubDatetime: 2025-08-28T15:40:00Z
modDatetime: 2025-12-10T08:20:00Z
title: "巨石不死：把 jQuery 多页应用渐进式重构成 Vue3 + Vite 的微前端实录"
slug: jquery-to-vue3-systemjs-microfrontend
featured: true
draft: false
tags:
  - Vue3
  - Vite
  - Micro-frontend
  - 架构
description: "没有停机窗口、不能全量重写的老系统怎么现代化？用 System.js 轻量微前端 + Nginx 路由分发 + 主子应用通信协议，让 jQuery 巨石与 Vue3 新代码长期共存、逐页迁移、业务零中断。"
---

接手的系统是一个典型的"巨石"：jQuery + RequireJS(AMD) 的多页应用，几百个页面挤在一个仓库里，全局变量互相依赖，没人敢动公共文件。推翻重写？业务一天不能停；维持现状？新需求开发速度越来越慢。

最终我们选了**渐进式重构**：老系统继续运行，新模块用 Vue 3 + Vite 独立开发，通过 System.js 微前端在运行时拼进同一个站点，路由级灰度，逐页替换。整个迁移跨越一年多，线上业务零中断。这篇复盘架构设计的核心决策。

## Table of contents

## 一、为什么不选 qiankun / Module Federation

调研过三种主流方案，最终选了最朴素的 System.js：

| 方案                        | 评估                                                                                                       |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- |
| qiankun 类沙箱方案          | 对基座有侵入，HTML Entry 与老系统的 AMD 全局环境冲突多；沙箱隔离在我们这种"允许共享全局"的迁移期反而是负担 |
| Module Federation           | 需要 webpack 5，而老系统是 RequireJS + 自建打包，改造成本高；运行时版本协商复杂                            |
| **System.js + Import Maps** | 基座只需引入一个 15KB 的运行时；子应用用 Vite 原生产出 `system` 格式；没有黑盒，通信协议自己定             |

迁移期的目标是"**让新代码以最低成本插进来**"，而不是一步到位的终局架构。System.js 的简单反而是它最大的优势。

## 二、子应用：Vite 构建成 System 模块

每个新模块就是一个独立 Vite 工程，构建配置关键在 `formats: ["system"]`：

```ts
// vite.config.ts
export default defineConfig({
  base: "https://cdn.example.com/mfe/work-order/", // 独立部署、独立版本
  build: {
    target: "es2015",
    rollupOptions: {
      output: {
        format: "system",
        entryFileNames: "assets/[name].[hash].js",
      },
      // 共用依赖外置，从 import map 取，避免每个子应用各打一份 Vue
      external: ["vue", "vue-router", "@org/shared"],
    },
  },
});
```

构建产物是一组带内容哈希的 System 模块 + 一个 manifest。子应用入口约定导出挂载/卸载两个生命周期：

```ts
// 子应用入口 main.ts
import { createApp } from "vue";
import App from "./App.vue";

let app: ReturnType<typeof createApp> | null = null;

export async function mount(container: HTMLElement, props: MicroProps) {
  app = createApp(App);
  app.provide("microProps", props); // 用户信息、埋口、主题都从这里进
  app.mount(container);
}

export async function unmount() {
  app?.unmount();
  app = null;
}
```

## 三、基座：Import Map + 运行时加载

老系统（基座）只增加极少量代码。页面里放一张 import map，声明共享依赖和各子应用的入口地址：

```html
<script type="systemjs-importmap">
  {
    "imports": {
      "vue": "https://cdn.example.com/vendor/vue.runtime.esm-browser.js",
      "@org/shared": "https://cdn.example.com/shared/index.js",
      "@mfe/work-order": "https://cdn.example.com/mfe/work-order/entry.js"
    }
  }
</script>
<script src="https://cdn.example.com/system.min.js"></script>
```

基座侧的加载器只有 30 行：

```js
async function loadMicroApp(name, container, props) {
  const api = await System.import(`@mfe/${name}`);
  await api.mount(container, props);
  return api; // 保留引用，路由切走时调 unmount
}
```

老页面完全不受影响——只有命中"新模块名单"的页面才会执行加载器。

## 四、路由分发：Nginx 决定谁来渲染

用户访问的是同一个域名，新旧页面的切换在 Nginx 层完成，浏览器地址和书签全部保持不变：

```nginx
# 新模块：指向新静态资源桶，回退到子应用入口交给 history 路由
location /work-order/ {
    proxy_pass https://new-frontend-bucket/;
    try_files $uri /work-order/index.html;
}

# 其余路径：老应用原封不动
location / {
    root /usr/share/nginx/legacy;
    try_files $uri $uri/ /index.html;
}
```

这带来两个关键能力：

- **灰度**：按路径、按用户 Cookie（Nginx `split_clients`）甚至按地域决定路由，先放 1% 流量到新模块；
- **可回滚**：子应用出问题，Nginx 配置把路径切回老实现，分钟级生效，不依赖发版。

## 五、主子应用通信：克制地约定三件事

微前端最容易失控的是通信。我们只约定了三条通道，并写进子应用接入规范：

1. **初始化 Props（下传）**：基座在 `mount` 时传入用户身份、权限码、环境标识、统一的请求实例（带好拦截器和鉴权头）；
2. **全局事件总线（横向/上报）**：一个 20 行的发布订阅，约定事件名前缀（`mfe:*`），子应用只允许发事件、不允许直接读基座内部状态；
3. **URL（返回与跳转）**：跨应用导航一律走真实 URL，不做 JS 层路由劫持，保证刷新、前进后退、分享链接全部正确。

```js
// 事件总线约定示例
microBus.emit("mfe:navigate", { path: "/legacy/task/123" });
microBus.on("mfe:user-changed", payload => store.setUser(payload));
```

样式上不做强隔离（避免 Shadow DOM 弹层/字体问题），而是约定子应用根节点带唯一命名空间 class，配合 CSS Modules / scoped 样式控制边界；全局组件库版本通过 import map 统一，杜绝双实例。

## 六、迁移节奏与收益

一年多的迁移分三步走：

1. **搭骨架（1 个月）**：基座接入 System.js、CDN、CI/CD，选一个边缘新模块试点；
2. **高频页面优先（6 个月）**：按访问量和改动频率排期，迁一个、删一块老代码，公共 jQuery 插件逐步用 Vue 组件替代；
3. **长尾收敛**：剩余低频页面最后处理，老系统只作为兜底存在。

新模块开发效率回到正常水平：Vite 的 HMR、Vue 3 的组合式 API、完整的 TypeScript 类型；新老页面同域运行，用户无感知；最关键的是**每一步都可以独立上线、独立回滚**，没有"大爆炸"式的切换日。

渐进式重构的本质不是技术选型，而是风险管理：把一次高风险重写，拆成几百次低风险的日常提交。
