import { defineStore } from "pinia";
import { watchEffect } from "vue";

/** Persisted shape version; bump when the stored object changes incompatibly. */
const STORAGE_KEY = "reading-settings";
const STORAGE_VERSION = 1;

/** Whitelist of fields persisted to localStorage. */
const PERSIST_FIELDS = ["fontScale", "lineHeight", "contentWidth"] as const;
type PersistField = (typeof PERSIST_FIELDS)[number];

export type ContentWidth = "narrow" | "normal" | "wide";

const FONT_SCALE_MIN = 0.85;
const FONT_SCALE_MAX = 1.25;
const FONT_SCALE_STEP = 0.05;

const LINE_HEIGHT_OPTIONS = [1.4, 1.6, 1.75, 1.9] as const;
export const LINE_HEIGHT_VALUES = [...LINE_HEIGHT_OPTIONS];

const CONTENT_WIDTH_MAP: Record<ContentWidth, string> = {
  narrow: "40rem",
  normal: "48rem",
  wide: "60rem",
};
export const CONTENT_WIDTH_OPTIONS: ContentWidth[] = [
  "narrow",
  "normal",
  "wide",
];

const DEFAULTS = {
  fontScale: 1,
  lineHeight: 1.75,
  contentWidth: "normal" as ContentWidth,
};
/** SSR baseline used to keep the first client render markup identical. */
export const READING_DEFAULTS = DEFAULTS;

function clampFontScale(value: number): number {
  if (!Number.isFinite(value)) return DEFAULTS.fontScale;
  const stepped = Math.round(value / FONT_SCALE_STEP) * FONT_SCALE_STEP;
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, stepped));
}

function isValidLineHeight(value: unknown): value is number {
  return (
    typeof value === "number" && LINE_HEIGHT_OPTIONS.includes(value as never)
  );
}

function isValidContentWidth(value: unknown): value is ContentWidth {
  return (
    typeof value === "string" &&
    (CONTENT_WIDTH_OPTIONS as string[]).includes(value)
  );
}

function readPersisted(): Partial<typeof DEFAULTS> | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.__v !== STORAGE_VERSION) return null;
    const out: Partial<typeof DEFAULTS> = {};
    if (typeof parsed.fontScale === "number") {
      out.fontScale = clampFontScale(parsed.fontScale);
    }
    if (isValidLineHeight(parsed.lineHeight))
      out.lineHeight = parsed.lineHeight;
    if (isValidContentWidth(parsed.contentWidth))
      out.contentWidth = parsed.contentWidth;
    return out;
  } catch {
    return null;
  }
}

function applyCssVariables(state: typeof DEFAULTS) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--reader-font-scale", String(state.fontScale));
  root.style.setProperty("--reader-line-height", String(state.lineHeight));
  root.style.setProperty(
    "--reader-max-width",
    CONTENT_WIDTH_MAP[state.contentWidth]
  );
}

export const useReadingStore = defineStore("reading", {
  state: () => ({ ...DEFAULTS, ...(readPersisted() ?? {}) }),
  actions: {
    setFontScale(value: number) {
      this.fontScale = clampFontScale(value);
    },
    setLineHeight(value: number) {
      if (isValidLineHeight(value)) this.lineHeight = value;
    },
    setContentWidth(value: ContentWidth) {
      if (isValidContentWidth(value)) this.contentWidth = value;
    },
    reset() {
      this.fontScale = DEFAULTS.fontScale;
      this.lineHeight = DEFAULTS.lineHeight;
      this.contentWidth = DEFAULTS.contentWidth;
    },
  },
});

/**
 * Keep <html> CSS variables in sync with the store. Runs once per store
 * instance and cleans up on app unmount.
 */
export function syncReadingCssVariables(
  store: ReturnType<typeof useReadingStore>
) {
  return watchEffect(() => {
    applyCssVariables({
      fontScale: store.fontScale,
      lineHeight: store.lineHeight,
      contentWidth: store.contentWidth,
    });
  });
}

/**
 * Pinia plugin: persist the reading store to localStorage on every change,
 * and seed it on init. Scoped to the "reading" store only.
 */
export function readingPersistPlugin({
  store,
}: {
  store: ReturnType<typeof useReadingStore>;
}) {
  if (store.$id !== "reading") return;

  store.$subscribe(() => {
    if (typeof localStorage === "undefined") return;
    try {
      const payload: Record<string, unknown> = { __v: STORAGE_VERSION };
      const state = store.$state as unknown as Record<string, unknown>;
      for (const field of PERSIST_FIELDS) {
        payload[field] = state[field];
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* storage full / disabled — ignore */
    }
  });
}
