import type { DemoMeta } from "@/types/demo";

export default {
  order: 5,
  framework: "native",
  title: { zh: "CSS 骨架屏", en: "CSS skeleton" },
  description: {
    zh: "原生 HTML/CSS 实现内容占位与微光扫过，配合少量脚本完成加载态切换；系统开启减少动效或站点关闭动画时降级为静态色块。",
    en: "Native HTML/CSS placeholders with a shimmer sweep plus a small script for the loading toggle; falls back to static blocks when reduced motion is preferred or site animations are off.",
  },
} satisfies DemoMeta;
