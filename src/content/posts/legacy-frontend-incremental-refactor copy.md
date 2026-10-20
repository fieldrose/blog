---
author: Mimas
pubDatetime: 2026-10-16T12:00:00Z
modDatetime: 2026-10-19T12:00:00Z
title: "渐进式重构：存量前端项目的双轨迁移"
slug: legacy-frontend-incremental-refactor
featured: false
draft: false
tags:
  - Vue3
  - Vite
  - 架构
description: "移动端 WebView 内嵌 H5 的 jQuery + AMD 门户项目，以双入口灰度、按角色放量的方式渐进式重构为 Vue3 + Vite SPA 的过程记录。"
---

接手的是一个移动端 App 的内嵌 H5 项目：原生客户端（Android / iOS / 鸿蒙三端）负责登录与页面容器，前端是 jQuery（1.x 为主，3.x 混用）+ AMD 组件的多页应用，定位为"集成门户"——40 多个页面，管理约 180 个业务菜单，对接不同系统的业务，绝大多数以 URL 为边界、通过客户端方法跳转打开。代码经多轮迭代，没有状态管理，没有统一通信约定，兼容目标被手持终端（PDA）钉在 Android 6 / iOS 10。

重构的动因：需求方开始重视这个集成入口，要求在存量业务之外叠加数据看板、分析图表、功能管理、客服助手、AI 助手等新业务，老架构承载不了这种叠加，业务全景也无人能说清，只能靠读代码逐一还原。约束同样明确：业务不能停，客户端由其他同事维护，我能动的只有前端。

最终没有引入任何微前端框架，而是采用最朴素的双入口灰度：新旧两套前端并存，按角色逐步放量，用约一年（与日常迭代并行）完成全量切换。

## 一、总体策略：双入口 + 按角色放量

登录发生在客户端自己的页面里，前端不参与登录流程。登录成功后，后端返回首页地址，客户端加载该地址完成登录态落地；地址上携带 token 作为用户唯一凭证，也是前端后续所有请求的令牌来源——此外不存在任何登录接口。

新旧两版是同域名下的不同路径（/oneapp 与 /newoneapp），生产环境同时部署、同时运行。所有跨域（含 iframe）由后端转发收敛为同域。

新版首页为卡片式结构：携带 token 调用用户角色接口，返回角色信息与首页卡片 id 列表；前端维护 id 到卡片组件的映射，卡片配置可在后端管理端调整。放量路径：先用测试白名单让部分用户进入新版，再按角色分批放开——管理类角色的业务先迁，逐步扩展到一线角色，最后全量切换。

回滚开关在后端：管理端按角色调整登录接口返回的首页地址即可切回旧版。前端为这个能力付出的成本是双轨维护——放量期间新功能要在两版各实现一遍；旧版没有构建工具，只能手写 ES5。

## 二、客户端桥接：三端三种协议

客户端方法通过 WebView 注入到 window，前端以 window.xxx() 调用。三端协议互不相同：

- Android 与 iOS 功能对等，但方法名与参数结构不同，如 window.android.jumpNewTab(url, options, type) 与 window.ios.jumpNewOne({ url, options, type })；
- 注入内容与页面层级绑定，客户端只支持两层：登录时初始化第一层方法，客户端跳转打开"新 tab"后注入第二层，两层的 API 差异显著；
- 鸿蒙端走第三方通信库，需先手动拉起通信、在其回调中注册方法，然后才能在该作用域内调用。

为统一调用方式，首页加载时即完成鸿蒙的通信初始化，并把所有客户端方法统一挂载到 window 上。iframe 嵌入的二级页面（内部系统或第三方页面）在鸿蒙环境下需要各自重复这套初始化。

桥接层收敛在单个 clientFunction.js：按 UA 判定当前环境，再分发到对应实现。三端固定、方法量有限的前提下，if/else 是最务实的选择；其局限也很清楚——若新增平台或方法规模膨胀，应演进为接口定义 + 三端各自实现的依赖倒置结构。

涉及的能力：页面跳转、回退、重新登录、退出、定位、获取设备标识（IMEI）、拍照等。鸿蒙端联调时单独维护了一个测试页，集中调用各能力配合客户端同学验证。

```js
// clientFunction.js 分发逻辑（示意）
import { isAndroid, isIOS, isHarmony } from "./env";

export function jumpNewTab(url, options, type) {
  if (isAndroid) return window.android.jumpNewTab(url, options, type);
  if (isIOS) return window.ios.jumpNewOne({ url, options, type });
  if (isHarmony) return window.harmony.jumpNewTab(url, options, type);
}
```

## 三、兼容性：legacy 产物与遗留问题

兼容目标 Android 6 / iOS 10，使用 Vite 的 @vitejs/plugin-legacy 产出双份产物做语法降级，本地以 Chrome 49 作为验证基线。

一个未彻底解决的问题：公司提供了一套仅发布构建产物的 Web Components 组件库（源码不可修改），legacy 构建后在本地 Chrome 49 可运行，生产 WebView 上却报错。事后推测：legacy 插件只做语法转译与 core-js polyfill，Custom Elements / Shadow DOM 属于平台 API，缺失无法靠转译补齐，需要额外的 polyfill；而 Android 6 的出厂 WebView 内核更老，PDA 设备基本不会更新。当时未深入排查，作为遗留问题记录。

## 四、路由与状态：memory 模式 + 手动路由栈

老版的页面组织：底部导航四个 tab 对应四个 HTML，首页上方一整块 iframe，切 tab 即替换 iframe 的 src；页面跳转靠客户端方法（覆盖当前页打开新页）或直接替换 URL；状态散落在 URL query、cookie、storage 与各模块内部。

新版为 Vue3 + Vite 的单页应用，路由采用 vue-router 的 memory 模式，由两个约束共同决定：

1. 生产环境有互联网暴露面管控：服务端只放行预先登记的路径与静态资源 URL，其余一律拦截。带内容哈希的构建产物每次构建都要重新登记全部路径，history 模式的路由 URL 同样会被拦截；
2. WebView 中导航本就由客户端接管——跳转是客户端开新页、返回走客户端方法——history 模式的核心收益（URL 分享、浏览器前进后退）在此不存在。

memory 模式下 vue-router 不对外暴露内部路由栈（内部维护 queue 与 position，公开接口只有当前 location），WebView 的 history 栈又是空的，而移动端需要支持左滑手势回退到上一层，只能自行维护栈：用响应式数组记录每次路由变动，手势触发时回退一级。

```ts
// 手动路由栈（示意）：memory 模式拿不到内部栈，只能自己记
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

TypeScript 只用于少数偏底层模块（路由栈、手势这类），团队对 TS 熟练度不一，全量引入不现实。状态管理用 Pinia：token 最初统一存 storage，上线后部分用户反馈异常，收敛为内存态——每次进入都由客户端携带新 token，内存态恰好贴合会话生命周期。UI 组件主要使用 Vant。

## 五、过渡期：双轨并行

放量期间两套系统并存，互跳规则明确：

- 首页卡片 → 新业务：站内 vue-router 切换，做类原生的页面过渡效果；
- 首页卡片 → 老业务：调用客户端方法打开新 tab 并指定 URL；
- 存量业务大量以 iframe 嵌入（内部系统或第三方页面），这些业务分散、改造量太大。评估过 qiankun 与 SystemJS，都需要对子应用做侵入式改造，成本上不可行，最终保留 iframe 集成。

这与"门户"定位一致：对约 180 个外接业务，新版接管的是入口、角色、卡片与新增业务，存量异构系统继续以 URL 为边界集成。

## 六、部署

构建产物通过 SFTP 上传：先经零信任客户端接入内网，再逐台替换 8 台主机的对应目录（/oneapp 与 /newoneapp 分目录存放）。没有 CI，发布是纯手工流程——这也是暴露面白名单每次构建都要重新登记的背景。

## 七、结果与复盘

约一年完成迁移：管理类角色业务先迁，按角色分批放量，最终全量切换到新版，后续迭代全部在新版上进行；数据看板、分析图表、功能管理、客服助手、AI 助手等新业务均落在新版架构上。

复盘：

- 渐进式的本质是风险管理：双入口把一次高风险重写拆成按角色分批的低风险切换，且随时可回滚；
- 技术决策多由约束驱动：白名单拦截与客户端接管导航推出 memory 模式，PDA 设备钉死 legacy 构建，改造成本决定保留 iframe；
- 代价同样真实：放量期功能双写（旧版手写 ES5），桥接层 if/else 存在演进空间，Web Components 组件库在老内核上的兼容问题未彻底解决。
