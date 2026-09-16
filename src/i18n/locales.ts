/**
 * 语言配置 — 单一数据源
 * 同时被 astro.config.ts（构建时路由）和 Header.astro（前端切换菜单）引用。
 */

export interface LocaleInfo {
  /** Astro locale 标识 */
  code: string;
  /** 本地语言名称 */
  label: string;
  /** 英文显示名称 */
  labelEn: string;
}

export const locales: LocaleInfo[] = [
  { code: "zh", label: "中文", labelEn: "Chinese" },
  { code: "en", label: "English", labelEn: "English" },
];

/** Astro i18n config 需要的 locales 字符串数组 */
export const localeCodes = locales.map(l => l.code);
