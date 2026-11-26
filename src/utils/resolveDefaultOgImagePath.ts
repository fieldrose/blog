import type { ResolvedAstroPaperConfig } from "@/types/config";
import { getAssetPath } from "./withBase";

const publicFiles = import.meta.glob("/public/*", { eager: false });

function existsInPublic(filename: string): boolean {
  return `/public/${filename}` in publicFiles;
}

/**
 * 解析页面/文章统一使用的 OG 图绝对路径。
 *
 * 安全约束：`site.ogImage` 必须是 `public/` 下的单个文件名，
 * 以防止路径穿越或引用任意文件。
 *
 * 行为：
 * - 启用 `features.dynamicOgImage` 时，优先使用存在的 `public/{site.ogImage}`，
 *   否则回退到生成的 `/og.png`。
 * - 未启用时，要求 `public/{site.ogImage}` 必须存在。
 */
export function resolveDefaultOgImagePath(
  config: ResolvedAstroPaperConfig
): string {
  const filename = config.site.ogImage;
  if (
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    throw new Error(
      `site.ogImage must be a single filename in public/ (e.g. "default-og.jpg"), got "${filename}"`
    );
  }

  if (config.features.dynamicOgImage) {
    return existsInPublic(filename)
      ? getAssetPath(filename)
      : getAssetPath("og.png");
  }

  if (!existsInPublic(filename)) {
    throw new Error(
      `AstroPaper: missing public/${filename}. Add that file, or set site.ogImage to an existing file under public/, or enable features.dynamicOgImage to fall back to /og.png.`
    );
  }

  return getAssetPath(filename);
}
