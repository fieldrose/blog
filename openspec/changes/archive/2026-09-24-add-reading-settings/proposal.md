# Proposal: Vue 3 阅读设置面板（Pinia）

## Why

博客以长文阅读为主，但目前正文排版参数（字号、行距、内容宽度）是写死的，读者无法按偏好调整。在简历叙事中，我们承诺「Vue 3 承载阅读设置面板（Pinia + 偏好持久化）」；同时这也是项目中第一个真正跑起来的 Vue 岛屿，用来验证 `@astrojs/vue` 的 `appEntrypoint`（已装 `VueQueryPlugin`）+ Pinia 插件、React/Vue 两框架岛屿共存、以及 CSS 变量驱动的排版联动。

## What changes

- 新增 `pinia` 依赖，并在 [src/pages/_app.ts](file:///Users/mimas/Documents/code/blog/src/pages/_app.ts) 中 `app.use(createPinia())`，与已有的 VueQueryPlugin 并列挂载。
- 新增 Pinia store [src/stores/reading.ts](file:///Users/mimas/Documents/code/blog/src/stores/reading.ts)：状态 `fontScale`（0.85–1.25，步进 0.05）、`lineHeight`（1.4–1.9 枚举）、`contentWidth`（`narrow`/`normal`/`wide` 三档）；动作 `set*`/`reset`；通过 Pinia 插件把状态持久化到 `localStorage`（key `reading-settings`，仅持久化上述三项，版本号兜底）。
- 新增 Vue 3 单文件组件 [src/components/vue/ReadingSettings.vue](file:///Users/mimas/Documents/code/blog/src/components/vue/ReadingSettings.vue)：齿轮图标按钮 + 弹出面板（复用 Header 语言菜单的无障碍模式：`aria-expanded` / 外部点击关闭 / Esc 关闭），面板内含三个控件组（字号 +/− 与重置、行距单选、内容宽度单选）；`client:idle` 挂载到 Header。
- 设置生效方式：store 变更时把 `--reader-font-scale` / `--reader-line-height` / `--reader-max-width` 三个 CSS 变量写到 `<html>`；在 [src/styles/typography.css](file:///Users/mimas/Documents/code/blog/src/styles/typography.css) 的 `.app-prose` 上用 `calc()` 应用，与 `data-theme` 暗色模式正交；变量挂根节点，View Transition 切换天然保留。
- 在 [src/layouts/Layout.astro](file:///Users/mimas/Documents/code/blog/src/layouts/Layout.astro) 的 FOUC 脚本旁边加一段**内联同步脚本**：首屏即读 `localStorage` 并把 CSS 变量写到 `<html>`，避免刷新后先按默认渲染再跳变。
- i18n 新增 `readingSettings` 段（按钮 title、面板标题、字号/行距/宽度标签、重置、各档位说明），zh/en 同步。
- Header 注入受 `features.readingSettings` 门控（`astro-paper.config.ts` 与 `src/config.ts`、`src/types/config.ts` 同步加开关，默认 `true`）。

## Non-goals

- 不做阅读进度同步到账号（纯本地偏好，无网络请求）。
- 不做字体族切换（保持现有 JetBrains Mono）。
- 不做移动端横屏/竖屏的独立档位。

## Impact

- 仅引入 `pinia` 一个新依赖；不引入 `pinia-plugin-persistedstate`（自写 20 行插件，避免锁定第三方 API）。
- Vue 岛屿在 Header 按需水合；未开启功能时零 JS 输出。
- CSS 变量只在文章正文 `.app-prose` 内生效，不影响导航/Header 排版。
