import config from "@/config";
import { BLOG_PATH } from "@/utils/blogPath";
import { getPostSlug } from "@/utils/getPostPaths";

type PostMeta = {
  draft: boolean;
  pubDatetime: string | undefined;
  slug: string | undefined;
};

/**
 * Frontmatter fields of every post, resolved by Vite at build time.
 *
 * `getCollection()` cannot run inside the Cloudflare worker: importing it drags
 * the `glob()` content loader (and `fdir`) into the server chunk, and `fdir`
 * evaluates `createRequire(import.meta.url)` at module scope. `import.meta.url`
 * is `undefined` in workerd, so the route throws before any handler runs.
 *
 * `getCollection` is also unavailable here for another reason: it is async and
 * reads the whole entry, which would bundle the rendered markdown pipeline.
 * The `?post-meta` imports are compiled away instead, leaving a plain manifest
 * with no filesystem access at runtime.
 */
const postMetas = import.meta.glob("/src/content/posts/**/*.{md,mdx}", {
  eager: true,
  query: "?post-meta",
  import: "default",
}) as Record<string, PostMeta>;

// Content is static: the set cannot change within a warm function instance.
let cachedSlugs: Set<string> | null = null;

/** Normalizes route-style slugs (leading/trailing slashes) to the stored form. */
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
 * Mirrors `getPostSlug(post.id, post.filePath)` for a glob key.
 * The glob loader uses the frontmatter `slug` verbatim as the content id.
 */
function slugFromKey(key: string, meta: PostMeta): string {
  const filePath = key.replace(/^\/+/, "");
  const fallbackId = filePath
    .slice(`${BLOG_PATH}/`.length)
    .replace(/\.[^./]+$/, "");
  return normalizeSlug(getPostSlug(meta.slug ?? fallbackId, filePath));
}

/** Slugs of every currently published (non-draft, publish-time passed) post. */
export async function getPublishedPostSlugs(): Promise<Set<string>> {
  if (cachedSlugs) return cachedSlugs;

  cachedSlugs = new Set(
    Object.entries(postMetas)
      .filter(([, meta]) => isPublished(meta))
      .map(([key, meta]) => slugFromKey(key, meta))
  );

  return cachedSlugs;
}

/** Whether `slug` points at a real published post. */
export async function isPublishedPostSlug(slug: string): Promise<boolean> {
  const slugs = await getPublishedPostSlugs();
  return slugs.has(normalizeSlug(slug));
}
