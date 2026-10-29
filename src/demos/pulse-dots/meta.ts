import type { DemoMeta } from "@/types/demo";

export default {
  order: 4,
  framework: "astro",
  title: { zh: "呼吸的加载点", en: "Breathing dots" },
  description: {
    zh: "三个点依次缩放，用来表示等待状态。",
    en: "Three dots scale in sequence to indicate a pending state.",
  },
} satisfies DemoMeta;
