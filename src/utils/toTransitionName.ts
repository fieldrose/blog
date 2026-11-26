import { slugifyStr } from "./slugify";

/**
 * 生成合法的 CSS `<custom-ident>`，用作 view-transition-name。
 * CSS ident 仅允许 [a-zA-Z0-9_-] 与 U+00A0 及以上的 Unicode 字符。
 * 非 ASCII 字符按十六进制编码，ASCII 特殊字符（:, / 等）
 * 替换为连字符，避免浏览器忽略该名称。
 */
export const toTransitionName = (str: string): string => {
  const base = slugifyStr(str.replaceAll(".", "-"));
  let result = base
    // 编码非 ASCII 字符（中文、日文等）
    .replace(
      /[^\x00-\x7F]/gu,
      c => "u" + c.codePointAt(0)!.toString(16).padStart(6, "0")
    )
    // 替换其余非法字符（冒号、斜杠等）
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    // 合并连续连字符并去除首尾连字符
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  // CSS ident 不能以数字开头
  if (/^\d/.test(result)) result = "p-" + result;
  if (!result) result = "post";
  return result;
};
