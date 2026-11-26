import { getRelativeLocaleUrl } from "astro:i18n";
import { BLOG_PATH } from "@/utils/blogPath";
import { slugifyStr } from "./slugify";
import config from "@/config";

function getPostPathSegments(filePath: string | undefined): string[] {
  return (
    filePath
      ?.replace(BLOG_PATH, "")
      .split("/")
      .filter(path => path !== "")
      .filter(path => !path.startsWith("_"))
      .slice(0, -1)
      .map(segment => slugifyStr(segment)) ?? []
  );
}

function getIdSlug(id: string): string {
  const postId = id.split("/");
  return postId.length > 0 ? String(postId[postId.length - 1]) : id;
}

/**
 * 拼接文章 slug 路径：目录段逐级 slugify 后追加文章 id 末段。
 * 返回值不含前导斜杠，例如 `examples/my-post`。
 */
function getPostSlugPath(id: string, filePath: string | undefined): string {
  const pathSegments = getPostPathSegments(filePath);
  const slug = getIdSlug(id);
  return pathSegments.length > 0
    ? [...pathSegments, slug].join("/")
    : String(slug);
}

export { getPostSlugPath };

/**
 * 返回仅含 slug 的路径，供 `getStaticPaths` 作为路由参数使用。
 * 不含 base 与 locale 前缀，二者由 Astro 在上层处理。
 * 例如 `/examples/my-post`。
 */
export function getPostSlug(id: string, filePath: string | undefined): string {
  return `/${getPostSlugPath(id, filePath)}`;
}

/**
 * 返回可直接导航的完整 URL，供 `<a href>` 与 RSS 链接使用。
 * 通过 `getRelativeLocaleUrl` 同时套用 locale 路由与 Astro base 配置。
 * 例如 `/posts/my-post` 或 `/en/posts/my-post`。
 */
export function getPostUrl(
  id: string,
  filePath: string | undefined,
  locale: string | undefined = config.site.lang
): string {
  return getRelativeLocaleUrl(locale, `posts/${getPostSlugPath(id, filePath)}`);
}
