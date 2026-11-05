<script setup lang="ts">
import { ref } from "vue";
import { vSkeleton } from "./skeletonDirective";

/**
 * Vue 3 island 示例：
 * - framework: "vue" → 在 .astro 里以 client:visible 挂载
 * - 骨架屏抽离为本地指令 v-skeleton（见 skeletonDirective.ts）
 * - 指令替换的是宿主子节点，这里只需要切换 loading 布尔值
 */
const loading = ref(true);
</script>

<template>
  <div class="flex h-full flex-col gap-2 p-3">
    <div class="min-h-0 flex-1" v-skeleton="loading">
      <article class="grid gap-2 text-sm">
        <div class="flex items-center gap-2">
          <span
            class="bg-accent/15 text-accent grid size-9 place-items-center rounded-full font-semibold"
          >
            M
          </span>
          <div class="grid">
            <span class="font-semibold">Mimas</span>
            <span class="text-muted-foreground text-xs">前端 · 工程实践</span>
          </div>
        </div>
        <p class="text-muted-foreground leading-relaxed">
          骨架节点与真实内容在同一个容器内互换，加载完成后原样恢复。
        </p>
      </article>
    </div>

    <button
      type="button"
      class="border-border hover:border-accent focus:outline-accent self-end rounded border px-2.5 py-1 text-xs"
      @click="loading = !loading"
    >
      {{ loading ? "结束加载" : "重新加载" }}
    </button>
  </div>
</template>

<style>
/* 指令生成的骨架节点不在 Vue 模板内，样式必须保持非 scoped（默认即全局） */
.sk-skeleton {
  display: grid;
  gap: 0.55rem;
  align-content: start;
}

.sk-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.sk-head-lines {
  flex: 1;
  display: grid;
  gap: 0.35rem;
}

.sk {
  position: relative;
  overflow: hidden;
  border-radius: 0.375rem;
  /* 以 foreground 低透明度混入 muted，明暗主题下都比舞台底色略深或略浅 */
  background-color: color-mix(
    in oklab,
    var(--color-foreground) 10%,
    var(--color-muted)
  );
}

.sk::after {
  content: "";
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in oklab, var(--color-foreground) 18%, transparent),
    transparent
  );
  animation: sk-shimmer 1.6s ease-in-out infinite;
}

.sk-avatar {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 999px;
  flex: none;
}

.sk-line {
  height: 0.55rem;
  border-radius: 999px;
}

.sk-block {
  height: 2.4rem;
  border-radius: 0.5rem;
}

.sk-w40 {
  width: 40%;
}
.sk-w60 {
  width: 60%;
}
.sk-w75 {
  width: 75%;
}
.sk-w90 {
  width: 90%;
}

@keyframes sk-shimmer {
  to {
    transform: translateX(100%);
  }
}

/* 系统偏好：减少动效 */
@media (prefers-reduced-motion: reduce) {
  .sk::after {
    display: none;
  }
}

/* 站点阅读设置里的"简略动画效果"开关 */
html[data-simple-animation="on"] .sk::after {
  display: none;
}
</style>
