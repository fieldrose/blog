import { defineStore } from "pinia";
import { watchEffect } from "vue";

// localStorage 中阅读设置的存储键与版本号
const STORAGE_KEY = "reading-settings";
const STORAGE_VERSION = 1;

// 需要持久化的字段
const PERSIST_FIELDS = [
  "fontScale",
  "lineHeight",
  "contentWidth",
  "simpleAnimation",
] as const;

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
// 默认值
const DEFAULTS = {
  fontScale: 1,
  lineHeight: 1.75,
  contentWidth: "normal" as ContentWidth,
  simpleAnimation: false,
};

export const READING_DEFAULTS = DEFAULTS;

// 把字号缩放限制在合法区间，并对齐到步长
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

// 从 localStorage 读取并校验持久化设置，版本不符或解析失败时返回 null
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
    if (typeof parsed.simpleAnimation === "boolean")
      out.simpleAnimation = parsed.simpleAnimation;
    return out;
  } catch {
    return null;
  }
}

// 把状态写入根元素 CSS 变量，供文章样式读取
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

// 阅读设置 store：字号、行高、内容宽度与简略动画
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
    setSimpleAnimation(value: boolean) {
      this.simpleAnimation = value;
    },
    reset() {
      this.fontScale = DEFAULTS.fontScale;
      this.lineHeight = DEFAULTS.lineHeight;
      this.contentWidth = DEFAULTS.contentWidth;
      this.simpleAnimation = DEFAULTS.simpleAnimation;
    },
  },
});

// 同步阅读设置的 CSS 变量
export function syncReadingCssVariables(
  store: ReturnType<typeof useReadingStore>
) {
  return watchEffect(() => {
    applyCssVariables({
      fontScale: store.fontScale,
      lineHeight: store.lineHeight,
      contentWidth: store.contentWidth,
      simpleAnimation: store.simpleAnimation,
    });
  });
}

// pinia 插件：持久化存储
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
      // 忽略存储错误
    }
  });
}
