# Design: MDX 双框架 Demo

## 路由：静态 totals 优先于全匹配

Astro 文件路由中静态段优先于动态段，`src/pages/api/reactions/totals.ts` 不会被 `[...slug].ts` 捕获。端点直接用 anon 服务端客户端读 `reaction_totals` 视图（视图 `security_invoker=off` 且已 grant anon），不做身份校验、不查文章白名单——它是全站聚合，没有 slug 维度。

## 跨框架共享的两层机制（刻意区分）

1. **UI 状态 → nanostores**：`counterAtom` 是纯 JS 模块单例，React/Vue 各自用官方绑定订阅。选择 nanostores 而非把计数放进 TanStack，是为了演示「客户端瞬时 UI 状态」与「服务端状态缓存」是两类问题。
2. **服务端状态 → TanStack 单例 QueryClient**：`src/lib/query/client.ts` 的模块单例已在 React Provider 与 Vue `_app.ts` 插件中共享。同键同参数的两个 `useQuery` 在同一 JS 应用上下文内由 QueryClient 去重；Astro 把每个框架打成独立 island chunk，但运行时 QueryClient 是同一模块实例（被两边 chunk 共享），因此只发一次请求。浏览器验证以 Network 面板为准；若极端情况下拆包导致双实例，Demo 文案据实描述（当前实现为单例）。

## 组件降级

totals Demo 在无 env（503）时显示 "unavailable" 短文本，不影响文章阅读；计数 Demo 纯本地，永可用。

## 踩坑：共享单例必须是 vue-query 的 QueryClient 子类

浏览器实测发现 Vue totals 岛始终停在初始态（isError=false、不发请求、observer 未注册）。根因：`@tanstack/vue-query@5.103` 的 `useBaseQuery` 只在 `client.isRestoring`（一个 Vue `ref`，由 vue-query 自己的 `QueryClient extends query-core#QueryClient` 子类提供）存在时才执行 `observer.subscribe()`；直接用 query-core 的基础 `QueryClient` 时 `isRestoring` 为 `undefined`，订阅永不发生。修复：`src/lib/query/client.ts` 改为从 `@tanstack/vue-query` 导入 `QueryClient`。该子类是核心类的严格扩展，react-query 照常接受；验证后 React/Vue 两岛共 1 次拉取（+全局默认的 1 次 retry），503 时两卡均降级。

## 文章位置

内容集合不按 locale 分文件（现有文章均为单语源、zh/en 路由均可渲染），故放 `src/content/posts/examples/framework-islands.mdx`，与 `examples/` 目录现有 4 篇一致，tag 用 `docs`。
