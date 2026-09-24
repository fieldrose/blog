import "astro:content";
import { getCollection } from "astro:content";
import { getPostSlug } from "@/utils/getPostPaths";
import { postFilter } from "@/utils/postFilter";

// Content is static: the set cannot change within a warm function instance.
let cachedSlugs: Set<string> | null = null;

/** Normalizes route-style slugs (leading/trailing slashes) to the stored form. */
export function normalizeSlug(slug: string): string {
  return slug.replace(/^\/+/, "").replace(/\/+$/, "");
}

/** Slugs of every currently published (non-draft, publish-time passed) post. */
export async function getPublishedPostSlugs(): Promise<Set<string>> {
  if (cachedSlugs) return cachedSlugs;

  const posts = await getCollection("posts");
  cachedSlugs = new Set(
    posts
      .filter(postFilter)
      .map(post => normalizeSlug(getPostSlug(post.id, post.filePath)))
  );

  return cachedSlugs;
}

/** Whether `slug` points at a real published post. */
export async function isPublishedPostSlug(slug: string): Promise<boolean> {
  const slugs = await getPublishedPostSlugs();
  return slugs.has(normalizeSlug(slug));
}
