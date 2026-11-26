import type { PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./client";

/**
 * React 岛屿的根 Provider：注入与 Vue 岛屿（见 src/pages/_app.ts）
 * 共用的模块级 QueryClient，实现跨框架缓存共享与请求去重。
 */
export default function QueryProvider({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
