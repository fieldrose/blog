---
author: Mimas
pubDatetime: 2026-10-16T12:00:00Z
modDatetime: 2026-10-19T12:00:00Z
title: "渐进式重构：存量前端项目的双轨迁移"
slug: legacy-frontend-incremental-refactor
featured: true
draft: false
tags:
  - Vue3
  - Vite
  - 架构
description: "移动端 WebView 内嵌 H5 的 jQuery + AMD 门户项目，以双入口灰度、按角色放量的方式渐进式重构为 Vue3 + Vite SPA 的过程记录。"
---

## Table of contents

## 一、背景

**项目定位**：移动端 App 内嵌 H5，承担集成门户角色——对接约 180 个业务菜单、40 余个页面，绝大多数业务以 URL 为边界集成，覆盖一线作业与管理场景。

**既有技术栈**：jQuery（1.x 为主，3.x 混用）+ 基于 AMD 的自研组件库，多页应用（MPA），无构建工具，新增页面需手写 ES5；原生客户端分 Android / iOS / 鸿蒙三端，由其他团队维护，通过 WebView 向页面注入 window 方法供 H5 调用。

**运行环境约束**：客户端使用系统原生 WebView 内核，兼容下限由手持终端（PDA）锁定为 Android 6 / iOS 10。

**重构动机**：需求方开始重视该集成入口，要求在存量业务之外叠加数据看板、分析图表、功能管理、客服助手、AI 助手等新业务。既有架构经多轮迭代，且之前较边缘。无状态管理、无统一通信约定、无文档，业务全景仅能通过阅读源码还原，已无法承载增量需求。

**约束条件**：业务不可中断；既有客户端不在改造范围内；重构需与存量版本的日常迭代并行推进。

**投入**：持续约一年。

**目标**：在不停机、可回滚的前提下，渐进式迁移至 Vue3 + Vite SPA应用。

## 二、功能点重构

### 功能点 1：客户端三端桥接适配层

**背景**
客户端由原生团队维护。三端均通过 WebView 注入 window 方法供 H5 调用，但协议互不兼容：Android 与 iOS 功能对等而方法名、参数结构不同（`window.android.jumpNewTab(url, options, type)` 与 `window.ios.jumpNewOne({ url, options, type })`）；注入内容与页面层级绑定，客户端仅支持两层，登录初始化第一层，经客户端跳转打开新页后注入第二层，两层 API 差异显著；鸿蒙端基于第三方通信库，需先手动拉起通信、在回调中注册方法后方可调用。老版本中这些调用散落在各业务代码内，无统一入口。

**目标**
在不改造客户端的前提下，收敛客户端能力调用入口，屏蔽三端协议差异，统一 H5 侧写法。

**结果**

- 落地：新增 `clientFunction.js` 作为薄适配层，基于 UA 判定运行环境后分发到对应实现；首页加载时完成鸿蒙的通信初始化，并将三端方法统一挂载到 window，使业务代码只依赖统一入口。
- 取舍：三端固定、方法量有限，采用 if/else 分发而非抽象接口；其局限明确——新增平台或方法规模膨胀时需扩充分支，不利于后续维护。
- 遗留问题：鸿蒙环境下以 iframe 集成的其他页面和使用客户端方法打开的二级页面无法继承首页的初始化，需各自独立重复拉起通信），属该端通信模型的固有限制。
- 覆盖能力：页面跳转、回退、重新登录、退出、定位、设备标识（IMEI）、拍照等。

#### 落地实现

```js
// env.js 判定运行环境（示意）
// 基于UA嗅探实现的简易客户端环境检测
export const isAndroid = /Android/i.test(navigator.userAgent);
export const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
export const isHarmony = /Harmony|harmony/i.test(navigator.userAgent);
```

```js
// clientFunction.js 分发逻辑（示意）
// 客户端方法的浅层适配层
import { isAndroid, isIOS, isHarmony } from "./env";

export function jumpNewTab(url, options, type) {
  if (isAndroid) return window.android.jumpNewTab(url, options, type);
  if (isIOS) return window.ios.jumpNewOne({ url, options, type });
  if (isHarmony) return window.harmony.jumpNewTab(url, options, type);
}
```

```js
// 业务组件内使用
import { jumpNewTab } from "@/utils/clientFunction";

jumpNewTab("xxxx/xxxx", { id });
```

#### 后续演进：依赖倒置与开闭原则

**痛点**

- 新增平台：客户端方法按平台差异化分发，每接入一个新平台（如鸿蒙或pc端），都需在 `env.js` 补判定、在 `clientFunction.js` 补分支，改动落在既有代码上——违反开闭原则。
- 新增方法：客户端能力有一百余项且随业务持续变化，每新增或调整一个方法，需在三端实现之外于分发函数内补一个分支，同样是对既有代码的修改。
- 调用耦合：业务层直接依赖 `window.android` / `window.ios` 等具体实现，与平台细节耦合——违反依赖倒置。

三者叠加，分发函数随平台与方法的增长持续膨胀，维护成本随之上升。

**演进方案**

1. 定义平台无关的抽象接口，只声明能力，不感知具体平台：

```ts
// bridges/types.ts（示意）
export interface ClientBridge {
  jumpNewTab(
    url: string,
    options?: Record<string, unknown>,
    type?: string
  ): void;
  back(): void;
  // 后续新增能力在此声明
}
```

2. 三端各自独立实现，按文件拆分维护（`bridges/android.ts` / `bridges/ios.ts` / `bridges/harmony.ts`），平台差异收敛在实现内部：

```ts
// bridges/android.ts（示意）
import type { ClientBridge } from "./types";

export const androidBridge: ClientBridge = {
  jumpNewTab(url, options, type) {
    window.android.jumpNewTab(url, options, type);
  },
  back() {
    window.android.back();
  },
};
```

```ts
// bridges/ios.ts（示意）：同一接口，内部映射为 iOS 的方法签名
import type { ClientBridge } from "./types";

export const iosBridge: ClientBridge = {
  jumpNewTab(url, options, type) {
    window.ios.jumpNewOne({ url, options, type });
  },
  back() {
    window.ios.goBack();
  },
};
```

3. 在唯一的组合根按环境选定实现并导出单一实例，平台判定只发生在此处：

```ts
// bridges/index.ts（示意）：唯一的平台判定点
import type { ClientBridge } from "./types";
import { androidBridge } from "./android";
import { iosBridge } from "./ios";
import { harmonyBridge } from "./harmony";
import { isAndroid, isHarmony } from "./env";

export const bridge: ClientBridge = isAndroid
  ? androidBridge
  : isHarmony
    ? harmonyBridge
    : iosBridge;
```

4. 业务层只依赖接口实例，调用处不再出现任何平台判断：

```ts
import { bridge } from "@/bridges";

bridge.jumpNewTab("/work-order/detail", { id });
```

**文件结构对比（示意）**

改造前：环境判定与全部客户端能力集中在同一模块，平台差异以 if/else 内联在分发函数中。

```
utils/
├── env.js            # 运行环境判定（UA 嗅探）
└── clientFunction.js # 客户端能力集中分发，内部按平台 if/else
```

改造后：接口与实现分离，三端各自独立文件维护，平台判定收敛到组合根。

```
bridges/
├── types.ts          # ClientBridge 接口定义（平台无关）
├── android.ts        # Android 实现
├── ios.ts            # iOS 实现
├── harmony.ts        # 鸿蒙实现
└── index.ts          # 组合根：按环境选定实现，导出唯一实例
```

新增平台时，只需新增 `bridges/<platform>.ts` 并在 `index.ts` 注册。

**收益**

- 新增能力：接口声明一处、三端各实现一次，调用方无分支；
- 新增平台：新增一个实现文件并在组合根注册一行，调用方与既有实现均不改动——对扩展开放、对修改关闭；
- 业务层依赖抽象接口，而非 `window.android` 等具体对象——依赖倒置。

**要点**：抽象层的价值在于让调用方不再做平台分支。若调用处仍 if/else 直接实例化具体实现，抽象层形同虚设，只是多了一层转发。

**说明**：该方案在重构初期评估过。由于重构与存量迭代并行、排期紧张，接口化拆分需额外抽象层与适配成本，最终仍以 `clientFunction.js` 的 if/else 分发落地，依赖倒置作为后续优化方向记录。

### 功能点 2：老内核兼容与构建降级

**背景**
客户端使用系统原生 WebView，内核版本低且不可控；兼容下限由 PDA 锁定为 Android 6 / iOS 10。既有项目以无构建工具 + 手写 ES5 规避该问题，不具备现代构建能力。

**目标**
在引入 Vite 与 Vue3 的前提下，保证目标内核可正常运行。

**结果**

- 选型：`@vitejs/plugin-legacy` 产出 legacy 双份产物，并按 `targets` 注入 core-js polyfill；本地以 Chrome 49 作为验证基线。

```js
// vite.config.ts
import { legacy } from "@vitejs/plugin-legacy";

export default {
  plugins: [
    legacy({
      targets: ["chrome >= 44", "ios_saf >= 10", "not dead"],
      // 构建期无法推导的平台 API，需显式声明
      additionalLegacyPolyfills: [
        "@webcomponents/custom-elements",
        "@webcomponents/shadydom",
      ],
    }),
  ],
};
```

- 其他问题：需要集成公司提供的 Web Components 组件库，但组件库仅发布构建产物、源码不可修改。需要通过 legacy 插件在构建时注入 polyfill，Custom Elements / Shadow DOM 属平台 API，须额外 polyfill；Android 6 出厂内核更旧，PDA 基本不升级。

**legacy 插件边界与成因**

各类特性的归属与处理方式：

| 特性类型         | 归属                 | 示例                       | 处理方式                      |
| :--------------- | :------------------- | :------------------------- | :---------------------------- |
| JS 语法 (Syntax) | Babel Transform      | `class`, `?.`, `const`     | 编译时转译，与 core-js 无关   |
| JS 内置对象/方法 | core-js              | `Promise`, `Array.flat`    | 运行时注入（Polyfill）        |
| Web/DOM API      | 独立 Polyfill        | `fetch`, `WebComponents`   | 需手动引入，不在 core-js 范围 |
| CSS 特性         | PostCSS/Autoprefixer | `flexbox`, `grid`, `:host` | 构建时处理，与 JS 无关        |

- **成因**：core-js 的模块表对应 ECMAScript 规范与 TC39 提案；Web Components、DOM、`fetch` 等由 WHATWG / W3C 定义，属宿主环境能力，不在表内。`useBuiltIns: 'usage'` 的「扫描源码 API 名 → 查 `core-js-compat` 表」链路因此无匹配入口——并非运行时判断不出缺失，而是构建期没有查询路径。
- **两个正交维度**：能否 polyfill 取决于是否可用旧 API 等价实现（`Proxy`、`BigInt`、`WeakRef` 均在 ECMAScript 范围内但不可实现，`Symbol` 可模拟但有损），与规范归属无关——平台 API 的问题在归属，语言新特性的问题在可行性。
- **插件范围**：`@vitejs/plugin-legacy` 覆盖四块——语法转译（babel）、ES API 补齐（core-js，继承上述边界）、转译产物运行时（`regenerator-runtime` / `@babel/runtime`）、加载机制（`module` / `nomodule` 双发、Safari 10.1 兼容补丁、SystemJS 兜底）。范围外的平台 API 仅经 `additionalLegacyPolyfills` 手动注入，该选项本身即边界的体现。
- **另注**：legacy 产物仅构建后生效，开发环境无法验证相关降级行为。

#### 排查与解决方向

当期评估、未落地；核心为「先定位缺失项，再按需补齐」，而非全量注入。

**定位**：客户端未开放远程调试入口（Android 需 `setWebContentsDebuggingEnabled(true)`，iOS 需 `isInspectable`），无法依赖 `chrome://inspect` / Safari Inspector。替代方案是注入全局错误上报，并在真机运行能力探针，逐项确认缺失的平台 API：

```js
// 能力探针（示意）：真机运行后回传
const probe = {
  customElements: "customElements" in window,
  attachShadow: !!Element.prototype.attachShadow,
  adoptedStyleSheets: "adoptedStyleSheets" in Document.prototype,
  resizeObserver: "ResizeObserver" in window,
};
```

**补齐**：按探针结果针对性引入。

| 缺失能力           | polyfill                          |
| ------------------ | --------------------------------- |
| Custom Elements v1 | `@webcomponents/custom-elements`  |
| Shadow DOM v1      | `@webcomponents/shadydom`         |
| adoptedStyleSheets | `construct-style-sheets-polyfill` |
| ResizeObserver     | `resize-observer-polyfill`        |

集成方式：经 `additionalLegacyPolyfills` 注入，或在 `index.html` 中置于业务 bundle 之前以保证加载顺序；整包可用 `@webcomponents/webcomponentsjs` 的 `webcomponents-loader.js` 自动按需加载。

**限制**：`shadydom` 在 DOM API 层实现隔离，老设备高频渲染有性能损耗；`:host`、`::slotted`、CSS 变量等样式层能力无法完全 polyfill，降级内核上隔离会失真。

**上游方向**：该类组件库多由 Lit / Stencil 产出，Stencil 原生支持 legacy 构建（`buildEs5` + `extras`，配套 `applyPolyfills()`），由维护方补齐平台 API 比前端兜底可靠；依赖面小时也可改用 Vant 或自研组件绕开。

### 功能点 3：路由与导航体系

**背景**
老版为 MPA：底部导航四个 tab 对应四个 HTML，首页上方整块 iframe，切换 tab 即替换 iframe 的 `src`；页面跳转依赖客户端方法（覆盖当前页打开新页）或直接替换 URL；WebView 内无有效的 history 栈。

**目标**
以 SPA 方式重建页面内导航，并在既有限制下选择可落地的路由模式。

**结果**

- 约束：生产侧存在互联网暴露面管控，服务端仅放行预先登记的路径与静态资源 URL，其余一律拦截。
- 选型分析：history 模式的核心收益（URL 分享、浏览器前进后退）在 WebView 中本就被客户端方法接管，收益有限；同时构建产物带内容哈希，每次构建均需重新登记暴露面白名单，history 的路由 URL 同样会被拦截，维护成本高。
- 结论：采用 vue-router 的 memory 模式，固定入口 URL，规避白名单逐次登记与路由拦截。
- 问题与处理：memory 模式不对外暴露内部路由栈（内部维护 queue / position，公开接口仅当前 location），而移动端需支持左滑手势回退到上一层，只能自行维护栈——以响应式数组记录路由变动，手势触发时回退一级。

```ts
// 手动路由栈（示意）：memory 模式取不到内部栈，只能自行记录
const routeStack = ref<RouteItem[]>([]);

function onRouteChange(item: RouteItem) {
  routeStack.value.push(item); // 跳转、模块切换时调用
}

function gestureBack() {
  if (routeStack.value.length > 1) {
    routeStack.value.pop();
    router.back();
  }
}
```

### 功能点 4：状态管理重构

**背景**
老版无状态管理，用户态与业务态分散在 URL query、cookie、storage 及各模块内部，跨页面共享依赖隐式约定；登录态由客户端登录后经 URL 携带的 token 提供，前端不存在登录接口。

**目标**
收敛为单一数据源，并与“进入即携带新 token”的会话模型对齐。

**结果**

- 落地：引入 Pinia 统一管理状态。
- 迭代：token 初始统一存于 storage，上线后有用户反馈异常；最终收敛为内存态——每次进入页面均由客户端携带新 token 下发，内存态与会话生命周期一致，也规避了持久化导致的脏数据问题。
- TypeScript 策略：团队 TS 熟练度不一，仅对路由栈、手势等底层模块使用 TS，业务层保持 JS。

### 功能点 5：存量业务集成策略

**背景**
约 180 个外接业务以 URL 为边界，多为异构系统，大量以 iframe 内嵌；iframe 与宿主页通过 `window.parent` 直接通信，无统一协议，耦合且分散。

**目标**
明确新业务与存量业务的集成边界，控制改造范围与成本。

**结果**

- 否决微前端：评估 qiankun 与 SystemJS，二者均要求对子应用做侵入式改造（HTML Entry、构建产物格式等）；在存量系统不可控、改造面过大的前提下成本不可行。
- 结论：保留 iframe 作为存量集成手段；新业务在 SPA 内以 vue-router 站内切换实现类原生过渡，老业务通过客户端方法打开新 tab 并指定 URL。
- 一致性：所有跨域（接口与 iframe）由后端转发收敛为同源，规避跨域与鉴权问题。
- 边界：新版接管入口、角色、卡片渲染与新增业务，存量异构系统继续以 URL 为边界集成。

### 功能点 6：首页卡片化与角色驱动渲染

**背景**
老首页以入口堆砌为主，信息结构简单，无角色区分，入口变更需改代码。

**目标**
以数据驱动的卡片式首页替代静态入口，支持按角色差异化呈现。

**结果**

- 数据流：登录后携带 token 调用用户角色接口，返回用户信息、角色标识与首页卡片 id 列表；前端维护 id 与卡片组件的映射关系。
- 呈现：卡片内容随角色差异化（如管理角色展示所辖片区员工的业务完成情况、薪资等）；卡片清单由后端管理端按角色维护、可动态调整，前端仅负责渲染。
- 说明：角色体系本身为后端重构产物，前端消费其接口结果。

### 功能点 7：灰度发布与双轨部署

**背景**
新旧两套前端并存，登录入口由客户端发起、后端返回首页地址决定。发布链路受网络环境限制，无 CI，采用零信任客户端接入 + SFTP 逐台替换 8 台主机的对应目录（`/oneapp` 与 `/newoneapp` 分目录存放）。

**目标**
在不中断业务、可随时回滚的前提下完成放量切换。

**结果**

- 落地：新旧版本位于同域名不同路径，生产环境同时部署；管理端按角色调整登录接口返回的首页地址即可完成切换与回滚，无需前端发版。
- 节奏：先以测试白名单放量，再按角色分批放开（管理类角色优先，逐步扩展至一线角色），最终全量切换。
- 代价：放量期间新功能需双轨实现——新版以 Vue 开发，旧版仍需手写 ES5；发布为纯手工流程，且构建产物哈希变化需逐次登记暴露面白名单。
- 结果：约一年完成全量迁移，迁移全程未停机，线上业务持续可用。

## 三、最终效果

- **工程化**：从无构建工具的 MPA 转为 Vite 构建的 SPA，具备依赖管理、模块化打包与 HMR，替换了手工编写 ES5 的增量方式。
- **代码组织**：老版单页承担过多职责、逻辑高度耦合、无模块化与文档，迭代前需通读源码定位；新版按路由与模块拆分，组合式 API 复用逻辑，底层模块以 TS 约束。
- **状态与路由**：状态由 query / cookie / storage 分散持有收敛为 Pinia 单一数据源；导航由客户端方法 + iframe 替换，转为 SPA 路由控制并支持手势回退。
- **兼容性**：legacy 双产物覆盖 Android 6 / iOS 10；Web Components 组件库在老内核上的兼容问题仍为遗留项。
- **交付模式**：从整站切换转为可灰度的双轨发布——按角色放量、无需发版即可回滚，迁移期间线上业务未中断。
- **业务承载**：数据看板、分析图表、功能管理、客服助手、AI 助手等新增业务均落在新版架构上；迁移完成后迭代全部在新版进行。
