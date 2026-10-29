---
author: Mimas
pubDatetime: 2026-10-29T02:00:00Z
modDatetime: 2026-10-29T02:00:00Z
title: "SPA 架构重建：路由、状态与卡片化首页"
slug: SPA架构重建：路由、状态与卡片化首页
featured: false
draft: false
tags:
  - Vue3
  - Vite
  - 项目经历
series: 项目经历-前端项目重构
seriesOrder: 3
description: "在 WebView 没有有效 history 栈、暴露面管控拦截路由 URL、登录态由 URL 携带 token 的前提下，重建路由、状态与首页三块地基的具体取舍。"
---

## Table of contents

本文是《[渐进式重构：存量前端项目的双轨迁移](/zh/posts/渐进式重构：存量前端项目的双轨迁移/)》的第三篇，对应总览中的「架构重建」层面。

旧版是 MPA：四个 tab 对应四个 HTML，每个页面各自维护状态，页面之间靠客户端方法跳转。重建这套地基时，三块内容互相牵连——路由决定了 URL 能否承担状态，状态决定了 token 存在哪，首页决定了角色如何参与渲染。

## 一、路由与导航体系

**背景**

老版为 MPA：底部导航四个 tab 对应四个 HTML，首页上方整块 iframe，切换 tab 即替换 iframe 的 `src`；页面跳转依赖客户端方法（覆盖当前页打开新页）或直接替换 URL；WebView 内无有效的 history 栈。

**目标**

以 SPA 方式重建页面内导航，并在既有限制下选择可落地的路由模式。

**结果**

- 约束：生产侧存在互联网暴露面管控，服务端仅放行预先登记的路径与静态资源 URL，其余一律拦截。移动端边缘手势由客户端识别，识别后通过 `window` 回调通知 H5 执行后退 / 前进。
- 选型分析：history 模式的核心收益（URL 分享、浏览器前进后退）在 WebView 中本就被客户端方法接管，收益有限；同时构建产物带内容哈希，每次构建均需重新登记暴露面白名单，history 的路由 URL 同样会被拦截，维护成本高。
- 结论：采用 vue-router 的 memory 模式，固定入口 URL，规避白名单逐次登记与路由拦截。
- 问题与处理：memory 模式不对外暴露完整路由栈（公开接口仅 `back` / `forward` 与当前 location）。手势由客户端识别后回调 H5，H5 需判断当前是否可退 / 可进并执行对应跳转，同时把栈状态回传客户端以控制手势可用性，故以响应式数组自行维护栈。

```ts
// RouterItem type.ts
interface RouteItem {
  path: string;
  name: string;
  component: () => Promise<Component>;
}

// 手动路由栈（示意）：memory 模式取不到内部栈，只能自行记录
const routeStack = ref<RouteItem[]>([]);

function onRouteChange(item: RouteItem) {
  routeStack.value.push(item); // 跳转、模块切换时调用
  syncStackState(); // 把栈状态回传客户端，控制手势可用性
}

// 客户端识别手势后调用，由 H5 判断是否可执行
window.userBack = () => {
  if (routeStack.value.length > 1) {
    routeStack.value.pop();
    router.back();
    syncStackState();
  }
};

window.userForward = () => {
  // forward 需要额外记录前进栈，示意略
  router.forward();
  syncStackState();
};

function syncStackState() {
  // 调用客户端方法上报栈深度，由客户端决定是否启用边缘手势
  window.client.updateStackState(routeStack.value.length);
}
```

## 二、状态管理重构

**背景**

老版无状态管理，用户态与业务态分散在 URL query、cookie、storage 及各模块内部，跨页面共享依赖隐式约定；登录态由客户端登录后经 URL 携带的 token 提供，前端不存在登录接口。

**目标**

收敛为单一数据源，并与「进入即携带新 token」的会话模型对齐。

**结果**

- 落地：初期引入 Pinia，但状态量小（token、开关、权限等）且为内存态，Pinia 的 store / getter / action 分层显得过度，团队 TS 熟练度也增加了类型推导成本。后改为 `ref` 模块单例作为全局状态，组件内直接 import 使用，去掉了 Pinia 的概念分层。
- 迭代：token 初始统一存于 storage，上线后有用户反馈异常；最终收敛为内存态——每次进入页面均由客户端携带新 token 下发，内存态与会话生命周期一致，也规避了持久化导致的脏数据问题。
- TypeScript 策略：团队 TS 熟练度不一，仅对路由栈、客户端方法桥接等底层模块使用 TS，业务层保持 JS。

```ts
// stores/global.ts（模块单例）：Vue 响应式对象脱离组件后依然生效，导出即全局共享
import { ref } from "vue";

interface UserInfo {
  id: string;
  name: string;
}

interface GlobalState {
  token: string;
  switches: Record<string, boolean>;
  permissions: string[];
  user: UserInfo | null;
}

const createInitialState = (): GlobalState => ({
  token: "",
  switches: {},
  permissions: [],
  user: null,
});

export const globalState = ref<GlobalState>(createInitialState());

export function setToken(token: string) {
  globalState.value.token = token;
}

export function clearSession() {
  globalState.value = createInitialState();
}
```

组件内直接 import，无需 `useStore()`：

```ts
import { globalState, setToken } from "@/stores/global";

const token = computed(() => globalState.value.token);
setToken(newToken);
```

也可以将部分业务独有的状态按组合式函数（hooks）封装：

```ts
// usePermission.ts
import { computed } from "vue";
import { globalState } from "@/stores/global";

export const usePermission = () => {
  const token = computed(() => globalState.value.token);
  const hasPermission = (code: string) =>
    globalState.value.permissions.includes(code);

  return {
    token,
    hasPermission,
  };
};
```

业务层解构使用：

```js
const { token, hasPermission } = usePermission();
```

**文件结构对比（示意）**

改造前：状态散落在各处，无统一存储点。

```
src/
├── pages/
│   ├── home.html      # 维护自己的 token、开关、菜单缓存
│   └── detail.html    # 再存一份 token
├── modules/
│   └── xxx.js         # 内部也存了同一份 token
└── utils/
    └── auth.js        # 工具函数里读写 cookie / localStorage
```

改造后：

```
stores/
├── global.ts        # 全局状态单例（token、开关、权限、用户）
└── usePermission.ts # 组合式函数：权限检查等衍生能力，也可以定义在业务组件附近
```

## 三、首页卡片化与角色驱动渲染

**背景**

老项目首页以 grid 布局的菜单列表为主（icon + 名字 + 用户权限锁），点击直接走客户端方法跳转。无明确角色与权限体系——大体上所有用户共用同一份菜单列表，部分菜单点开后才显示业务下线或权限不足。菜单由后端接口返回，后台管理页面维护数据库实现增删改。

新项目为 SPA，底部导航承载多个入口，新增首页以卡片列表的形式承载新的业务模块和旧的存量系统（iframe 集成的存量系统页面），菜单列表作为独立页面组件。新项目引入了明确的用户角色体系，每个角色需要对应不同的卡片列表。

**目标**

1. 数据驱动卡片渲染：后端返回顺序即渲染顺序，前端维护卡片 id → 组件的映射关系；
2. 角色驱动内容差异：后端按角色返回不同卡片列表，角色差异化内容由后端定义；
3. 用户自定义偏好：拖拽排序、显隐控制（角色对应的卡片集合固定，用户仅决定哪些展示）；偏好存后端以支持多设备切换同步；
4. 权限前置拦截：卡片按 `type` 字段标记所需权限，未授权前卡片正常展示但右下角加锁图标，点击拦截跳转认证页面，完成后回到原目标。

**结果**

- **接口调用顺序**：角色查询接口优先返回当前用户角色标识，随后以角色为参数调用卡片列表接口，后端按角色过滤并返回卡片数组（返回顺序即渲染顺序）。
- **卡片结构**：后端返回形如 `[{ id, type, needRefresh, ... }, ...]`，其中 `type` 对应所需权限类型，前端根据已获取的权限状态决定锁图标是否展示。
- **权限拦截流程**：点击卡片时检查 `type` → 无权限则拦截并跳转认证页面 → 记录待跳目标 → 认证完成后自动恢复原跳转。
- **用户自定义偏好**：拖拽排序与显隐设置存入后端，多设备登录时自动同步布局。
- **接口全为新写**：角色查询、卡片列表、认证接口均为新项目新增，不复用老项目的菜单接口。

## 小结

三块地基里，路由的约束最强——它决定了「页面」在 WebView 中意味着什么，也决定了 URL 能不能承担状态传递；状态管理随路由模式调整，从 Pinia 退回到 `ref` 模块单例；首页则把角色体系第一次引进来，成为后续所有新增业务承载差异化的入口。
