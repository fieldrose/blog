import type { DemoMeta } from "@/types/demo";

export default {
  order: 1,
  framework: "astro",
  title: { zh: "流动的渐变光晕", en: "Flowing gradient glow" },
  description: {
    zh: "多层模糊色块沿不同路径缓慢漂移，形成持续变化的背景。",
    en: "Layered blurred color blobs drift along different paths to form a shifting backdrop.",
  },
} satisfies DemoMeta;
