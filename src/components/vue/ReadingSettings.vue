<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import {
  CONTENT_WIDTH_OPTIONS,
  LINE_HEIGHT_VALUES,
  READING_DEFAULTS,
  syncReadingCssVariables,
  useReadingStore,
  type ContentWidth,
} from "@/stores/reading";
import type { UIStrings } from "@/i18n/types";

const props = defineProps<{
  labels: UIStrings["readingSettings"];
}>();

const store = useReadingStore();
syncReadingCssVariables(store);

const isOpen = ref(false);
// Until mounted, bind controls to the SSR defaults so the first client
// render (hydrated with persisted prefs in the store) matches server HTML.
const hydrated = ref(false);
const triggerRef = ref<HTMLButtonElement | null>(null);
const panelRef = ref<HTMLDivElement | null>(null);

const lineHeightLabels = computed(() => [
  props.labels.lineTight,
  props.labels.lineComfortable,
  props.labels.lineLoose,
  props.labels.lineExtraLoose,
]);

const widthLabels: Record<ContentWidth, string> = {
  narrow: props.labels.widthNarrow,
  normal: props.labels.widthNormal,
  wide: props.labels.widthWide,
};

function toggle() {
  isOpen.value = !isOpen.value;
}

function close() {
  isOpen.value = false;
  triggerRef.value?.focus();
}

function onWindowKeyDown(e: KeyboardEvent) {
  if (e.key === "Escape" && isOpen.value) close();
}

function onPointerDown(e: PointerEvent) {
  if (!isOpen.value) return;
  const target = e.target as Node;
  if (
    panelRef.value &&
    !panelRef.value.contains(target) &&
    !triggerRef.value?.contains(target)
  ) {
    close();
  }
}

onMounted(() => {
  hydrated.value = true;
  window.addEventListener("keydown", onWindowKeyDown);
  document.addEventListener("pointerdown", onPointerDown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onWindowKeyDown);
  document.removeEventListener("pointerdown", onPointerDown);
});

function stepFont(delta: number) {
  store.setFontScale(store.fontScale + delta);
}
</script>

<template>
  <div class="relative">
    <button
      ref="triggerRef"
      type="button"
      class="focus-outline hover:[&>svg]:stroke-accent relative size-12 p-4 sm:size-8"
      :title="labels.buttonTitle"
      :aria-label="labels.buttonTitle"
      :aria-expanded="isOpen"
      :aria-haspopup="'dialog'"
      aria-controls="reading-settings-panel"
      @click="toggle"
    >
      <svg
        class="absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 stroke-current"
        viewBox="0 0 24 24"
        fill="none"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="3" />
        <path
          d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        />
      </svg>
    </button>

    <div
      v-show="isOpen"
      ref="panelRef"
      id="reading-settings-panel"
      role="dialog"
      :aria-label="labels.panelTitle"
      class="bg-background border-border absolute right-0 z-50 mt-2 w-64 rounded-lg border p-4 shadow-lg"
    >
      <div class="mb-4 flex items-center justify-between">
        <span class="text-sm font-semibold">{{ labels.panelTitle }}</span>
        <button
          type="button"
          class="text-muted-foreground hover:text-accent text-xs underline underline-offset-2"
          @click="store.reset()"
        >
          {{ labels.reset }}
        </button>
      </div>

      <!-- Font size -->
      <fieldset class="mb-4">
        <legend class="mb-2 text-sm">{{ labels.fontSize }}</legend>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="focus-outline border-border hover:border-accent h-8 w-8 rounded border text-lg leading-none"
            :aria-label="labels.fontSize + ' −'"
            @click="stepFont(-0.05)"
          >
            −
          </button>
          <input
            type="range"
            min="0.85"
            max="1.25"
            step="0.05"
            :value="hydrated ? store.fontScale : READING_DEFAULTS.fontScale"
            class="accent-accent h-2 flex-1 cursor-pointer"
            @input="
              store.setFontScale(
                Number(($event.target as HTMLInputElement).value)
              )
            "
          />
          <button
            type="button"
            class="focus-outline border-border hover:border-accent h-8 w-8 rounded border text-lg leading-none"
            :aria-label="labels.fontSize + ' +'"
            @click="stepFont(0.05)"
          >
            +
          </button>
        </div>
      </fieldset>

      <!-- Line height -->
      <fieldset class="mb-4">
        <legend class="mb-2 text-sm">{{ labels.lineHeight }}</legend>
        <div class="flex flex-wrap gap-2">
          <label
            v-for="(lh, i) in LINE_HEIGHT_VALUES"
            :key="lh"
            class="flex items-center gap-1 text-xs"
          >
            <input
              type="radio"
              name="reader-line-height"
              :value="lh"
              :checked="
                hydrated
                  ? store.lineHeight === lh
                  : READING_DEFAULTS.lineHeight === lh
              "
              class="accent-accent"
              @change="store.setLineHeight(lh)"
            />
            <span>{{ lineHeightLabels[i] }}</span>
          </label>
        </div>
      </fieldset>

      <!-- Content width -->
      <fieldset>
        <legend class="mb-2 text-sm">{{ labels.contentWidth }}</legend>
        <div class="flex gap-2">
          <label
            v-for="w in CONTENT_WIDTH_OPTIONS"
            :key="w"
            class="flex items-center gap-1 text-xs"
          >
            <input
              type="radio"
              name="reader-content-width"
              :value="w"
              :checked="
                hydrated
                  ? store.contentWidth === w
                  : READING_DEFAULTS.contentWidth === w
              "
              class="accent-accent"
              @change="store.setContentWidth(w)"
            />
            <span>{{ widthLabels[w] }}</span>
          </label>
        </div>
      </fieldset>
    </div>
  </div>
</template>
