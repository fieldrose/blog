<script setup lang="ts">
import { ref } from "vue";

/**
 * Vue 3 island 示例：
 * - framework: "vue" → 在 .astro 里会以 client:visible 挂载
 * - 组件内部完全是 Vue 生态（ref / @click）
 * - 只渲染舞台内部内容（外壳由 DemoCard.astro 提供）
 */
const count = ref(0);
</script>

<template>
  <div class="stage-inner">
    <div class="flex flex-col items-center gap-3">
      <span class="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        Vue 3 · ref
      </span>
      <span
        class="text-3xl font-bold tabular-nums"
        aria-live="polite"
      >
        {{ count }}
      </span>
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded border border-border px-3 py-1 text-sm hover:border-accent focus:outline-accent"
          @click="count++"
        >
          +1
        </button>
        <button
          type="button"
          class="rounded border border-border px-3 py-1 text-sm hover:border-accent focus:outline-accent"
          @click="count = 0"
        >
          Reset
        </button>
      </div>
    </div>
  </div>
</template>
