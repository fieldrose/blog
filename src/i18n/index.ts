import type { UIStrings } from "./types";

export { tplStr } from "./format";

const modules = import.meta.glob<{ default: UIStrings }>("./lang/*.ts", {
  eager: true,
});

// 翻译字符串缓存
const translations: Record<string, UIStrings> = {};
for (const [path, mod] of Object.entries(modules)) {
  const locale = path.slice("./lang/".length, -".ts".length);
  translations[locale] = mod.default;
}

// 获取当前语言的翻译字符串
export function useTranslations(locale: string = "en"): UIStrings {
  return translations[locale] ?? translations["en"];
}
