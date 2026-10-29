import type { DemoMeta } from "@/types/demo";

export default {
  order: 6,
  framework: "vue",
  title: { zh: "Vue 计数器", en: "Vue counter" },
  description: {
    zh: "一个 Vue 3 island，首次进入视口时才 hydration。",
    en: "A Vue 3 island that hydrates when it enters the viewport.",
  },
} satisfies DemoMeta;
