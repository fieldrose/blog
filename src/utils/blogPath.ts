/**
 * Directory (relative to the project root) that holds the blog posts.
 *
 * Kept in its own module so that server routes can resolve post paths without
 * importing `content.config.ts`, which would drag the `glob()` content loader
 * (and its filesystem code) into the runtime bundle.
 */
export const BLOG_PATH = "src/content/posts";
