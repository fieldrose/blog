import type { DemoMeta } from "@/types/demo";

export default {
  order: 3,
  framework: "astro",
  title: { zh: "悬浮卡片", en: "Hover card" },
  description: {
    zh: "悬停时轻微抬升，边框与阴影随之变化。",
    en: "The card lifts slightly on hover, with border and shadow shifting together.",
  },
} satisfies DemoMeta;
