import type { FontData } from "astro:assets";

/**
 * 按字重与样式查找字体文件的 URL，供 satori 生成 OG 图时注入字体。
 * `options.style` 默认 normal、`options.format` 默认 truetype；
 * 命中多个候选时取第一个匹配格式，未匹配到返回 undefined。
 */
export function getFontPathByWeight(
  fonts: FontData[],
  weight: number,
  options?: {
    style?: "normal" | "italic";
    format?: string;
  }
): string | undefined {
  const style = options?.style ?? "normal";
  const format = options?.format ?? "truetype";

  for (const font of fonts) {
    if (font.weight === String(weight) && font.style === style) {
      const src = font.src.find(file => file.format === format) ?? font.src[0];
      if (src) return src.url;
    }
  }

  return undefined;
}
