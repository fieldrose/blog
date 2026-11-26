const THEME_KEY = "theme";
const LIGHT = "light";
const DARK = "dark";

/** 桌面导航与移动抽屉各有一个切换按钮。 */
const TOGGLE_SELECTORS = ["#theme-btn", "#theme-btn-mobile"];

function getPreferredTheme(): string {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored) return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? DARK
    : LIGHT;
}

// 若内联的防 FOUC 脚本已写入主题值则直接复用。
let themeValue: string =
  (window as unknown as { __theme?: { value: string } }).__theme?.value ??
  getPreferredTheme();

function persist(): void {
  localStorage.setItem(THEME_KEY, themeValue);
  reflect();
}

function reflect(): void {
  const root = document.firstElementChild;
  root?.setAttribute("data-theme", themeValue);
  root?.classList.toggle("dark", themeValue === DARK);
  for (const selector of TOGGLE_SELECTORS) {
    document.querySelector(selector)?.setAttribute("aria-label", themeValue);
  }

  // 用计算后的背景色填充 <meta name="theme-color">，
  // 让 Android 浏览器地址栏与页面背景保持一致。
  const bg = window.getComputedStyle(document.body).backgroundColor;
  document
    .querySelector("meta[name='theme-color']")
    ?.setAttribute("content", bg);
}

function setup(): void {
  reflect();
  for (const selector of TOGGLE_SELECTORS) {
    const button = document.querySelector<HTMLElement>(selector);
    // after-swap 会重建 DOM，但保留同一元素时避免重复绑定导致来回切换
    if (!button || button.dataset.themeBound === "true") continue;
    button.dataset.themeBound = "true";
    button.addEventListener("click", () => {
      themeValue = themeValue === LIGHT ? DARK : LIGHT;
      persist();
    });
  }
}

setup();

// View Transitions 导航后重新执行。
document.addEventListener("astro:after-swap", setup);

// 在 View Transitions 之间延续 theme-color 值，
// 避免页面切换时 Android 导航栏闪烁。
document.addEventListener("astro:before-swap", event => {
  const color = document
    .querySelector("meta[name='theme-color']")
    ?.getAttribute("content");
  if (color) {
    (event as { newDocument: Document }).newDocument
      .querySelector("meta[name='theme-color']")
      ?.setAttribute("content", color);
  }
});

// 跟随系统级明暗偏好的变化。
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", ({ matches }) => {
    themeValue = matches ? DARK : LIGHT;
    persist();
  });

export {};
