import type { DemoMeta } from "@/types/demo";

export default {
  order: 6,
  framework: "vue",
  title: { zh: "Vue 骨架屏", en: "Vue skeleton" },
  description: {
    zh: "把骨架屏抽离为 Vue 自定义指令 v-skeleton，指令按加载状态替换宿主子节点，组件只负责切换一个布尔值。",
    en: "Skeleton extracted into the Vue custom directive v-skeleton: the directive swaps the host's children by loading state, and the component only flips a boolean.",
  },
} satisfies DemoMeta;
