import { QueryClient } from "@tanstack/vue-query";

/**
 * 模块级单例 QueryClient，由 React 与 Vue island 共用。
 *
 * react-query 与 vue-query 都是 query-core 之上的薄适配层，注入同一实例
 * 即可让同一页面上的两套框架共享一份缓存：相同 query key 会去重为
 * 单次网络请求。
 *
 * 必须使用 vue-query 的 QueryClient 子类（而非 query-core 的原始类）：
 * vue-query 的 useBaseQuery 只有在 client 暴露 Vue ref `isRestoring` 时
 * 才会订阅其 observer。该子类继承自核心 QueryClient，react-query 可原样接受。
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
