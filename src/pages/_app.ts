import type { App } from "vue";
import { createPinia } from "pinia";
import { VueQueryPlugin } from "@tanstack/vue-query";
import { queryClient } from "@/lib/query/client";
import { readingPersistPlugin } from "@/stores/reading";

/**
 * Vue 应用入口，由 @astrojs/vue 为每个 Vue island 根节点调用。
 * 每个 island 拥有独立的 Vue 应用实例，因此每次 `createPinia()` 都产生
 * 独立的 store 容器 —— 同页面的 Vue island 之间不共享 Pinia 状态。
 * 当前刻意保持如此（仅存在一个阅读设置 island）；跨 island 共享状态
 * 需要模块级单例 pinia。
 */
export default (app: App) => {
  const pinia = createPinia();
  pinia.use(readingPersistPlugin as never);
  app.use(pinia);
  app.use(VueQueryPlugin, { queryClient });
};
