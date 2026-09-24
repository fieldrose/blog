<script setup lang="ts">
import { useStore } from "@nanostores/vue";
import { counterAtom, incrementCounter, resetCounter } from "@/stores/demo";

// Vue 3 island bound to the SAME framework-agnostic nanostores atom
// as the React CounterDemo.
const count = useStore(counterAtom);
</script>

<template>
  <div class="border-border my-4 rounded-lg border p-4">
    <p class="mb-3 text-sm">
      <span class="bg-muted rounded px-2 py-0.5 text-xs">Vue 3</span>
    </p>
    <p class="mb-3 text-2xl font-bold" aria-live="polite">Count: {{ count }}</p>
    <div class="flex gap-2">
      <button
        type="button"
        class="focus-outline border-border hover:border-accent rounded-md border px-3 py-1 text-sm"
        @click="incrementCounter"
      >
        +1
      </button>
      <button
        type="button"
        class="focus-outline border-border hover:border-accent rounded-md border px-3 py-1 text-sm"
        @click="resetCounter"
      >
        Reset
      </button>
    </div>
  </div>
</template>
