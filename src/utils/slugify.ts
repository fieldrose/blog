import kebabcase from "lodash.kebabcase";
import slugify from "slugify";

const hasNonLatin = (str: string): boolean => /[^\x00-\x7F]/.test(str);

/**
 * 采用混合策略生成 slug：
 * - 纯拉丁字符串：使用 slugify（例如 "E2E Testing" → "e2e-testing"）
 * - 含非拉丁字符的字符串：使用 lodash.kebabcase（保留非拉丁字符）
 */
export const slugifyStr = (str: string): string => {
  if (hasNonLatin(str)) {
    return kebabcase(str);
  }
  return slugify(str, { lower: true });
};

/** 批量对字符串数组生成 slug，保持原数组顺序。 */
export const slugifyAll = (arr: string[]) => arr.map(str => slugifyStr(str));
