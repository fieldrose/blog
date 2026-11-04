---
author: Mimas
pubDatetime: 2026-10-29T03:00:00Z
modDatetime: 2026-10-29T03:00:00Z
title: "Vue 项目的文件结构：官方立场、脚手架默认与社区实践"
slug: Vue项目文件结构组织：官方立场与社区实践
featured: false
draft: false
tags:
  - Vue
  - 工程化
  - 架构
  - 文件组织
description: "Vue 官方并未规定目录结构：Style Guide 管代码风格，create-vue 只提供默认脚手架，真正约束目录的是 Nuxt。本文梳理官方立场、脚手架默认结构、社区主流的 feature-based 划分及其两条依赖规则，并给出按项目规模选择结构的决策表。"
---

## Table of contents

「Vue 项目应该怎么分目录」这个问题，答案往往取决于回答者最近在哪个项目里踩过坑。本文尝试把它拆成三个层次：官方到底规定了什么、脚手架默认给了什么、社区形成的共识是什么。

需要先说明一个前提：**Vue 官方没有给出目录结构规范**。这一点常被误解，也是各种「最佳实践」说法分歧的根源。

## 一、官方规定的边界在哪里

Vue 的官方规则可以分三类，只有一类与目录相关。

**核心框架层面**：Vue 本身只处理组件、响应式与渲染，不关心文件放在哪里。`main.ts` 里 `createApp(App).mount()` 之后，组件从哪里导入由构建工具和开发者自行决定。

**官方 Style Guide**：这是 Vue 唯一的官方风格文档，分为四个优先级：

| 优先级 | 含义 | 是否涉及目录 |
|---|---|---|
| A - Essential | 防错规则，必须遵守 | 否 |
| B - Strongly Recommended | 提升可读性与开发体验 | 否 |
| C - Recommended | 存在多个等价选项，任选其一并保持一致 | 否 |
| D - Use with Caution | 特殊场景特性，需要克制使用 | 否 |

文档明确说明其范围是「Vue-specific code」，内容集中在组件命名、props 声明、模板写法、事件命名等。**整份 Style Guide 没有针对目录划分的条款**。

**脚手架层面**：`create-vue` 是官方推荐的脚手架，它会生成一套目录，但官方定位是「scaffolding tool」，即起点而非规范：

```
npm create vue@latest
```

**与 Nuxt 的对比**：Nuxt 作为 Vue 的元框架，对目录有明确规定——`pages/`、`components/`、`composables/`、`layouts/`、`server/` 各自承担约定式职责，文件放入对应目录即自动生效。这是真正意义上的「官方定义」，但适用范围是 Nuxt，不是 Vue。

因此可以这样概括：**Vue 在目录结构上是 unopinionated 的，官方只约束代码风格与组件命名；目录结构属于工程决策。**

## 二、脚手架的默认结构

以 `create-vue` 选择 Router 与 Pinia 为例，生成的 `src` 结构如下：

```
src/
├── assets/          # 静态资源，会被构建处理
├── components/      # 可复用组件
├── router/          # 路由配置
├── stores/          # Pinia store
├── views/           # 路由级页面组件
├── App.vue          # 根组件
└── main.ts          # 应用入口
```

其中 `components/` 与 `views/` 的分工需要明确：

- `views/` 存放与路由一一对应的页面组件，通常包含页面布局与数据编排
- `components/` 存放可被多处复用的组件，不感知路由

**适用规模**：单一业务域、组件数量在 20 到 30 个以内的项目。这一阶段按类型分层成本最低，过早引入功能模块划分会增加额外层级。

**失效时机**：当项目出现第二个独立业务域（例如登录认证、计费、后台管理），且 `components/` 目录已经难以快速浏览时。此时修改一个功能往往要跨 4 到 5 个目录，按类型分层的代价开始超过收益。

判断方法很直接：**如果完成一个功能需要改动多个互不相关的目录，说明分组方式与业务的边界不匹配。**

## 三、社区共识：按功能划分

社区目前较一致的方向是按业务域（feature）划分，而不是按文件类型划分。Vue School 的 Daniel Kelly 给出了一套可直接使用的参考结构：

```
src/
├── app/                       # 仅放应用级装配
│   ├── router/                # 根路由，汇总各 feature 的路由
│   ├── plugins/               # Pinia、i18n、第三方初始化
│   └── App.vue
├── shared/                    # 跨 feature、与业务领域无关
│   ├── ui/                    # BaseButton.vue、BaseModal.vue 等基础组件
│   ├── composables/           # useBreakpoint、useClipboard
│   ├── lib/                   # http 客户端、日期与格式化工具
│   └── types/
├── features/                  # 一个业务域一个目录
│   ├── auth/
│   │   ├── components/        # LoginForm.vue 等仅属于 auth 的组件
│   │   ├── composables/       # useAuth
│   │   ├── stores/            # auth 的 Pinia store
│   │   ├── api/               # auth 相关请求
│   │   ├── pages/             # LoginPage.vue 等路由级页面
│   │   ├── routes.ts          # 该 feature 的路由，由 app/router 汇总
│   │   └── types.ts
│   ├── billing/
│   └── dashboard/
├── assets/
└── main.ts
```

与此配套的两条依赖规则，是该结构成立的前提：

1. **只被一个 feature 使用的文件，放在该 feature 内部。** 一旦出现第二个 feature 需要使用，就提升到 `shared/`。`shared/` 中不放置任何与具体业务领域相关的代码。
2. **feature 之间不直接访问彼此的内部实现。** `billing` 需要 `auth` 的信息时，通过共享 store、路由参数或事件传递，不直接导入 `auth/components`。

两条规则共同限制的是依赖方向：

```
app  ──▶  features  ──▶  shared
              │
              └─✗─▶  其他 feature 的内部实现
```

`shared` 不依赖任何上层模块，`features` 之间保持平行，`app` 只负责装配。依赖方向单向且可检查，是这套结构能随规模扩展的原因。

## 四、更严格的分层方案：Feature-Sliced Design

如果团队需要明确的层级纪律，可参考 Feature-Sliced Design（FSD）。它把前端划分为固定层，并规定层间只能单向依赖：

| 层 | 职责 |
|---|---|
| `app` | 应用初始化、全局样式、provider |
| `pages` | 路由级页面组合 |
| `widgets` | 可独立使用的较大 UI 区块 |
| `features` | 用户可感知的完整行为 |
| `entities` | 业务实体（user、product）及其模型 |
| `shared` | 与业务无关的基础设施与 UI |

FSD 的优势是规则明确、可自动校验；代价是层级多、概念成本高。**中小型项目直接采用 FSD 往往分层过度**，多数团队在 `app / features / shared` 三层已经足够。

## 五、命名规范（这部分有官方依据）

目录结构没有官方规范，但**组件命名有**。官方 Style Guide 与社区实践可以合并为几条可直接执行的规则：

| 类型 | 规则 | 示例 |
|---|---|---|
| 单文件组件 | 统一 PascalCase | `UserProfile.vue` |
| 基础 UI 组件 | 以 `Base` 或 `App` 为前缀 | `BaseButton.vue`、`AppModal.vue` |
| 单实例组件 | 以 `The` 为前缀 | `TheHeader.vue`、`TheSidebar.vue` |
| 业务组件 | 多词命名，放在所属 feature 内 | `features/auth/components/LoginForm.vue` |

资源型（CRUD）应用的页面与路由命名也可以固定下来：

| 路径 | 路由名 | 组件 |
|---|---|---|
| `/users` | `UsersIndex` | `UsersIndex.vue` |
| `/users/create` | `UsersCreate` | `UsersCreate.vue` |
| `/users/:id` | `UsersShow` | `UsersShow.vue` |
| `/users/:id/edit` | `UsersEdit` | `UsersEdit.vue` |

跳转时使用命名路由，避免把 URL 拼接散落在组件中：

```vue
<router-link :to="{ name: 'UsersIndex' }">Users</router-link>
```

## 六、按规模选择结构

| 项目情况 | 建议结构 | 原因 |
|---|---|---|
| 原型或小型应用，1 到 2 人，组件少于 20 个，单一业务域 | 扁平分层：`components/`、`composables/`、`stores/`、`views/` | 功能模块带来的层级成本高于收益 |
| 成长期应用，同一代码库内出现多个业务域 | `src/features/` 下的功能模块 | 每个域的组件、store、API 集中在同一目录 |
| 多个业务域共享设计系统与工具 | 功能模块 + `shared/` 层 | 通用能力集中管理，不散落在某个 feature 内 |
| 多个可独立部署的应用共享代码 | Monorepo（pnpm / npm workspaces，必要时加 Turborepo 或 Nx） | 避免跨仓库复制或额外发布包 |
| Nuxt 项目，多团队负责不同部分 | 优先评估 Nuxt Layers | 比 workspace 更轻量，需按当前版本文档确认 |

## 七、常见误区

**一上手就采用完整分层。** 在没有第二个业务域时引入 `features/` 与 `shared/`，结果是多出一层空目录，反而增加查找成本。结构应当跟随业务复杂度演进。

**`shared/` 逐渐变成杂物间。** 任何「不确定放哪」的文件都被丢进 `shared/`，最终它变成第二个 `components/`。判断标准是：只要代码中出现业务名词（订单、发票、用户权限），它就不属于 `shared/`。

**所有状态都放进全局 store。** 在功能模块结构下，每个 feature 维护自己的 store，全局 store 只保留真正跨域的状态，例如当前登录用户、主题、语言。

**把 `views/` 当作普通组件目录使用。** `views/` 的语义是路由级页面，混入可复用组件会让页面与组件的边界再次模糊。

## 八、与 React 侧结论的对应关系

这套划分与 React 生态的结论高度一致。React 侧较早提出的「按功能分组、容器与组件分离、样式与测试就近放置」，在 Vue 中分别对应：

| React 侧主张 | Vue 中的对应做法 |
|---|---|
| 按功能分组，不按类型分组 | `features/<domain>/` |
| 容器负责逻辑，组件负责展示 | `views` 或 `pages` 负责编排，`components` 负责呈现 |
| 样式与组件同目录 | SFC 天然内联样式；独立样式文件放在组件旁 |
| 测试与源码同目录 | `__tests__` 与组件同目录，或直接 `*.spec.ts` 相邻 |
| 跨组件协作交由上层编排 | Pinia store、composable、事件总线 |

可以看到，React 与 Vue 在文件组织上的结论趋同，差异来自框架本身的约束强度：Vue 提供的约定更少，因此工程侧的决策空间更大，也更需要团队自行固化规则。

## 参考来源

- [Vue.js Style Guide（官方）](https://vuejs.org/style-guide/)
- [create-vue（官方脚手架）](https://github.com/vuejs/create-vue)
- [Vue.js Project Structure: A Feature-Based Architecture That Scales — Daniel Kelly, Vue School](https://vueschool.io/articles/vuejs-tutorials/how-to-structure-a-large-scale-vue-js-application/)
- [Feature-Sliced Design](https://feature-sliced.design/)
- [Pinia 官方文档](https://pinia.vuejs.org/)
