# Design: Vue 3 阅读设置面板

## 状态与持久化

Pinia store `useReadingStore`（id `"reading"`）只持有三个原始值，避免嵌套对象带来的 watch 粒度问题。持久化用自写插件：

```ts
pinia.use(({ store }) => {
  // read on init
  const raw = localStorage.getItem(KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.__v === VERSION) store.$patch(pick(parsed, FIELDS));
    } catch { /* ignore */ }
  }
  // subscribe to changes
  store.$subscribe((_mutation, state) => {
    localStorage.setItem(KEY, JSON.stringify({ __v: VERSION, ...pick(state, FIELDS) }));
  });
});
```

- `pick` 只取白名单字段，避免持久化内部 `_customProperties` 等。
- 不依赖 `pinia-plugin-persistedstate`：该插件需要序列化器配置，而我们只需三个字段，自写更可控、体积更小。

## CSS 变量应用

在 [typography.css](file:///Users/mimas/Documents/code/blog/src/styles/typography.css) `.app-prose` 上：

```css
.app-prose {
  font-size: calc(1rem * var(--reader-font-scale, 1));
  line-height: var(--reader-line-height, 1.75);
  max-width: var(--reader-max-width, 48rem);
}
```

`contentWidth` → `--reader-max-width` 映射：`narrow: 40rem`、`normal: 48rem`、`wide: 60rem`。字号/行距用数值，宽度用长度。

store 侧用 `watchEffect` 在状态变化时把变量写到 `document.documentElement.style`；这样 store 被任意岛屿（未来可能其他 Vue 岛也改字号）修改都会联动 DOM。

## 首屏同步脚本

放 [Layout.astro](file:///Users/mimas/Documents/code/blog/src/layouts/Layout.astro) `<head>` 内，紧跟 theme FOUC 脚本之后，`is:inline`：

```js
(function () {
  try {
    var raw = localStorage.getItem("reading-settings");
    if (!raw) return;
    var s = JSON.parse(raw);
    if (s.__v !== 1) return;
    var root = document.documentElement;
    if (typeof s.fontScale === "number") root.style.setProperty("--reader-font-scale", s.fontScale);
    if (typeof s.lineHeight === "number") root.style.setProperty("--reader-line-height", s.lineHeight);
    if (s.contentWidth) root.style.setProperty("--reader-max-width", { narrow: "40rem", normal: "48rem", wide: "60rem" }[s.contentWidth] || "48rem");
  } catch (_) {}
})();
```

不暴露到 window，避免污染。

## Pinia 安装位置

[src/pages/_app.ts](file:///Users/mimas/Documents/code/blog/src/pages/_app.ts) 是 `@astrojs/vue` 为每个 Vue 岛屿根调用的入口，必须在此 `app.use(createPinia())`。注意：每个岛屿是独立 app 实例，所以每个都会创建新的 Pinia 实例——同一页面多个 Vue 岛屿**不共享** store 状态。这对本功能无影响（只有一个阅读设置岛屿），但要在注释中声明，避免后续误以为跨岛共享。

若未来需要跨 Vue 岛屿共享，可改为模块级单例 `const pinia = createPinia()` 导出，各 app 共用；当前不做，避免引入隐藏耦合。

## 无障碍

- 面板用 `<div role="dialog" aria-modal="false" aria-label="...">`（非模态，因为 Header 其他按钮仍可点）；
- `aria-expanded` 绑定在触发按钮；
- Esc 用 `window.addEventListener("keydown")`（与 AuthDialog 一致，组件级 `onKeydown` 在面板内输入框聚焦时不可靠）；
- 外部点击：`onMounted` 时挂 `document.addEventListener("pointerdown", onOutside)`，`onUnmounted` 移除。

## i18n 键

`readingSettings` 段（约 12 键）：`buttonTitle`、`panelTitle`、`fontSize`、`lineHeight`、`contentWidth`、`reset`、`widthNarrow`、`widthNormal`、`widthWide`、`tight`、`comfortable`、`loose`。
