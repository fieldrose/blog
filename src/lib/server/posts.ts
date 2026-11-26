import config from "@/config";
import { BLOG_PATH } from "@/utils/blogPath";
import { getPostSlug } from "@/utils/getPostPaths";

type PostMeta = {
  draft: boolean;
  pubDatetime: string | undefined;
  slug: string | undefined;
};

/**
 * 全部文章的 frontmatter 字段，由 Vite 在构建期解析。
 *
 * `getCollection()` 无法运行在 Cloudflare worker 中：导入它会把 `glob()`
 * 内容加载器（以及 `fdir`）拖进服务端 chunk，而 `fdir` 在模块作用域执行
 * `createRequire(import.meta.url)`。workerd 中 `import.meta.url` 为
 * `undefined`，路由会在任何 handler 执行前抛错。
 *
 * `getCollection` 在此不可用的另一个原因：它是异步的且会读取完整条目，
 * 从而把渲染后的 markdown 管线一并打包。`?post-meta` 导入则在编译期被
 * 消除，只留下运行时无需文件系统访问的普通清单。
 */
const postMetas = import.meta.glob("/src/content/posts/**/*.{md,mdx}", {
  eager: true,
  query: "?post-meta",
  import: "default",
}) as Record<string, PostMeta>;

// 内容是静态的：在同一个热函数实例内集合不会变化。
let cachedSlugs: Set<string> | null = null;

/** 将路由风格的 slug（首尾斜杠）规范化为存储形式。 */
export function normalizeSlug(slug: string): string {
  return slug.replace(/^\/+/, "").replace(/\/+$/, "");
}

function isPublished(meta: PostMeta | undefined): boolean {
  if (!meta || meta.draft || !meta.pubDatetime) return false;

  const publishAt =
    new Date(meta.pubDatetime).getTime() - config.posts.scheduledPostMargin;
  return import.meta.env.DEV || Date.now() > publishAt;
}

/**
 * 对 glob key 复现 `getPostSlug(post.id, post.filePath)` 的结果。
 * glob 加载器会把 frontmatter 的 `slug` 原样作为内容 id。
 */
function slugFromKey(key: string, meta: PostMeta): string {
  const filePath = key.replace(/^\/+/, "");
  const fallbackId = filePath
    .slice(`${BLOG_PATH}/`.length)
    .replace(/\.[^./]+$/, "");
  return normalizeSlug(getPostSlug(meta.slug ?? fallbackId, filePath));
}

/** 当前已发布（非草稿且已过发布时间）文章的全部 slug。 */
export async function getPublishedPostSlugs(): Promise<Set<string>> {
  if (cachedSlugs) return cachedSlugs;

  cachedSlugs = new Set(
    Object.entries(postMetas)
      .filter(([, meta]) => isPublished(meta))
      .map(([key, meta]) => slugFromKey(key, meta))
  );

  return cachedSlugs;
}

/** 判断 `slug` 是否指向真实存在的已发布文章。 */
export async function isPublishedPostSlug(slug: string): Promise<boolean> {
  const slugs = await getPublishedPostSlugs();
  return slugs.has(normalizeSlug(slug));
}
