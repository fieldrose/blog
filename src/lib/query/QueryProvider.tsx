import type { PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./client";

/**
 * React island root provider. Injects the SAME module-singleton QueryClient
 * that Vue islands use (via src/pages/_app.ts), enabling cross-framework
 * cache sharing and request dedup.
 */
export default function QueryProvider({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
