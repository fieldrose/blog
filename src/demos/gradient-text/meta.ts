import type { DemoMeta } from "@/types/demo";

export default {
  order: 2,
  framework: "astro",
  title: { zh: "渐变文字", en: "Gradient text" },
  description: {
    zh: "渐变裁切到文字字形上并改变位置，产生流动的高光。",
    en: "The gradient is clipped to the glyphs and its position animates, creating a moving highlight.",
  },
} satisfies DemoMeta;
