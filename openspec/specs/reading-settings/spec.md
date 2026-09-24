# reading-settings Specification

## Purpose
为阅读者提供字号、行距、内容宽度三项排版偏好设置：Vue 3 岛屿面板写入 Pinia store，localStorage 持久化（带版本校验），通过 CSS 变量作用于文章正文，并保证 SSR 首屏与水合一致性。

## Requirements

### Requirement: Pinia store 与状态形状

`src/stores/reading.ts` MUST 导出一个 Pinia store `useReadingStore`，其状态只包含 `fontScale: number`（范围 0.85–1.25，步进 0.05，默认 1）、`lineHeight: number`（枚举 1.4 | 1.6 | 1.75 | 1.9，默认 1.75）、`contentWidth: "narrow" | "normal" | "wide"`（默认 `"normal"`）。store MUST 提供 `setFontScale`、`setLineHeight`、`setContentWidth`、`reset` 四个动作；`reset` MUST 把三项恢复为默认值。超出 `fontScale` 范围的赋值 MUST 被 clamp 到边界，而不是写入非法值。

#### Scenario: 重置动作恢复默认

- **GIVEN** store 中 `fontScale=1.2`、`lineHeight=1.4`、`contentWidth="wide"`
- **WHEN** 调用 `reset()`
- **THEN** 三项分别变为 `1`、`1.75`、`"normal"`

#### Scenario: 字号越界自动 clamp

- **GIVEN** 当前 `fontScale=1`
- **WHEN** 调用 `setFontScale(2)`
- **THEN** `fontScale` 被写入 `1.25`（上限）而非 `2`

### Requirement: localStorage 持久化

store MUST 通过 Pinia 插件把上述三项持久化到 `localStorage` 的 `reading-settings` 键（JSON 字符串）。任何动作写入后 MUST 在 `requestAnimationFrame` 或微任务内完成持久化。读取时 MUST 做版本与形状校验：若 `localStorage` 中版本号不匹配、字段缺失或类型错误，MUST 忽略损坏数据并回落到默认值，不得抛错。

#### Scenario: 损坏的 localStorage 被忽略

- **GIVEN** `localStorage.getItem("reading-settings")` 返回 `"{\"fontScale\":\"big\"}"`（类型错误且缺少版本）
- **WHEN** 页面加载后读取 store
- **THEN** store 状态为默认值（`fontScale=1`、`lineHeight=1.75`、`contentWidth="normal"`），且控制台无未捕获异常

### Requirement: CSS 变量联动

store 状态变更后 MUST 同步把三个 CSS 自定义属性写到 `document.documentElement`：`--reader-font-scale`（数值，如 `1.15`）、`--reader-line-height`（数值，如 `1.75`）、`--reader-max-width`（长度，如 `48rem`）。`.app-prose` MUST 通过 `font-size: calc(1rem * var(--reader-font-scale, 1))`、`line-height: var(--reader-line-height, 1.75)`、`max-width: var(--reader-max-width, 48rem)` 应用这些变量；未设置变量时回退到与历史一致的默认排版。

#### Scenario: 调整字号即时生效

- **GIVEN** 打开一篇文章，`<html>` 上 `--reader-font-scale` 为 `1`
- **WHEN** 点击阅读设置面板「字号 +」直到 `fontScale` 变为 `1.15`
- **THEN** `<html>` 的 `style` 中出现 `--reader-font-scale: 1.15`，且正文 `<p>` 的计算字号变为 `1.15rem`

#### Scenario: 无 localStorage 时回退默认排版

- **GIVEN** 浏览器首次访问，`localStorage` 无 `reading-settings`
- **WHEN** 渲染文章正文
- **THEN** 正文排版与引入该功能前完全一致（`font-size: 1rem`、`line-height: 1.75`、`max-width: 48rem`）

### Requirement: 首屏无跳变

`Layout.astro` MUST 在 `<head>` 内联一段**同步**脚本：在首屏绘制前读取 `localStorage` 的 `reading-settings`，校验后把三个 CSS 变量写到 `<html>`。该脚本 MUST 不依赖 Vue/Pinia，且 MUST 在 theme 脚本之后执行，避免与 `data-theme` 冲突。

#### Scenario: 刷新后不出现排版跳变

- **GIVEN** 用户已把 `fontScale` 调为 `1.2` 并持久化
- **WHEN** 刷新文章页
- **THEN** 首次 paint 时正文字号即为 `1.2rem`，不出现默认字号再跳到 `1.2rem` 的过程

### Requirement: 无障碍与交互

`ReadingSettings.vue` 面板 MUST：
- 触发按钮带 `aria-expanded`、`aria-haspopup="dialog"`、`aria-controls` 指向面板；
- 打开时面板可被 Esc 关闭，点击面板外区域关闭，关闭后焦点回到触发按钮；
- 所有控件为原生 `<input type="range">` / `<input type="radio">`，带 `<label>` 与 `aria-label`；
- `client:idle` 水合，未配置 `features.readingSettings` 时 MUST 不输出该岛屿。

#### Scenario: Esc 关闭面板并回焦

- **GIVEN** 阅读设置面板已打开且焦点在面板内的字号滑块上
- **WHEN** 按下 Escape
- **THEN** 面板关闭（`aria-expanded` 变 `false`），焦点回到齿轮触发按钮

### Requirement: 功能门控

`features.readingSettings` 为 `false` 或 `astro-paper.config.ts` 未声明时，Header MUST 不渲染 `ReadingSettings` 岛屿，且构建产物中无相关岛屿 JS。i18n 文案 MUST 在 zh/en 同时存在；缺失任何一个语言键 MUST 导致 `astro check` 失败。

#### Scenario: 关闭功能时零岛屿

- **GIVEN** `features.readingSettings = false`
- **WHEN** 构建首页
- **THEN** 首页 HTML 中不包含 `astro-island` 指向 `ReadingSettings` 的节点
