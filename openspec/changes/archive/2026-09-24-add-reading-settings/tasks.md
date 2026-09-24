# Tasks: Vue 3 阅读设置面板

## 1. 依赖与配置

- [x] 1.1 `pnpm add pinia`；`astro-paper.config.ts` / `src/config.ts` / `src/types/config.ts` 加 `features.readingSettings`（默认 true）
- [x] 1.2 `src/pages/_app.ts` 加 `app.use(createPinia())` 并注册持久化插件

## 2. Store

- [x] 2.1 `src/stores/reading.ts`：状态 + clamp 动作 + reset + 自写持久化插件（版本号 + 白名单字段 + try/catch）
- [x] 2.2 watchEffect 把三个 CSS 变量写到 `<html>`

## 3. 组件

- [x] 3.1 `src/components/vue/ReadingSettings.vue`：齿轮按钮 + 面板 + 字号滑块/±、行距单选、内容宽度单选、重置 + Esc/outside 关闭 + 焦点返回
- [x] 3.2 i18n `readingSettings` 段加入 `types.ts` / `zh.ts` / `en.ts`
- [x] 3.3 Header.astro 注入（`features.readingSettings` 门控，`client:idle`，语言菜单旁）

## 4. 样式与首屏

- [x] 4.1 `src/styles/typography.css` `.app-prose` 加三个 CSS 变量应用（font-size calc、line-height、max-width）
- [x] 4.2 `src/layouts/Layout.astro` 内联首屏同步脚本（theme 脚本之后，版本号校验 + try/catch）

## 5. 验证

- [x] 5.1 `astro check` / `lint` / `build` 通过；`features.readingSettings=false` 时零岛屿
- [x] 5.2 浏览器冒烟：齿轮开/关面板、字号 +/− 实时改变正文字号（16px→17.6px @1.1）、内容宽度切换、重置恢复默认、刷新保持、损坏 localStorage 回落默认、Esc 关闭并回焦
- [x] 5.3 `openspec validate add-reading-settings --strict` 通过，`--all --strict` 5/5
