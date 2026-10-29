import type { DemoMeta } from "@/types/demo";

export default {
  order: 5,
  framework: "react",
  title: { zh: "React 计数器", en: "React counter" },
  description: {
    zh: "一个 React 19 island，首次进入视口时才 hydration。",
    en: "A React 19 island that hydrates when it enters the viewport.",
  },
} satisfies DemoMeta;
