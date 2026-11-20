import { readFileSync } from "node:fs";

const VIRTUAL_PREFIX = "\0post-meta:";
const FRONTMATTER_BLOCK = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/;
const DRAFT_FIELD = /^draft:\s*(true|false)\s*$/m;
const PUB_DATETIME_FIELD = /^pubDatetime:\s*["']?([^"'\s#]+)/m;
const SLUG_FIELD = /^slug:\s*["']?([^"'\s#]+)/m;

export type PostMeta = {
  draft: boolean;
  pubDatetime: string | undefined;
  /** Content id suffix: the glob loader uses `data.slug` verbatim when set. */
  slug: string | undefined;
};

type ResolveContext = {
  resolve: (
    source: string,
    importer?: string,
    options?: { skipSelf?: boolean }
  ) => Promise<{ id: string } | null>;
};

/**
 * Resolves `?post-meta` imports of markdown files to their frontmatter fields.
 *
 * Server routes need a published-slug whitelist, but importing the real content
 * modules would pull the full markdown pipeline (Shiki grammars, rendered HTML)
 * into the worker bundle. This plugin reads the file at build time and emits
 * only the two fields the whitelist needs.
 *
 * Imports are rewritten to opaque virtual ids: Astro's own markdown plugin
 * claims every id containing a `.md`/`.mdx` extension in its `load` hook, and
 * would compile the full entry again.
 */
export function postMetaPlugin() {
  const fileById = new Map<string, string>();
  let nextId = 0;

  return {
    name: "post-meta",
    enforce: "pre" as const,
    async resolveId(
      this: ResolveContext,
      source: string,
      importer: string | undefined
    ) {
      const [bareSource, query] = source.split("?");
      if (!query?.split("&").includes("post-meta")) return null;
      if (!/\.(md|mdx)$/.test(bareSource)) return null;

      const resolved = await this.resolve(bareSource, importer, {
        skipSelf: true,
      });
      if (!resolved) return null;

      const id = `${VIRTUAL_PREFIX}${nextId++}`;
      fileById.set(id, resolved.id);
      return id;
    },
    load(id: string) {
      const filePath = fileById.get(id);
      if (!filePath) return null;

      const source = readFileSync(filePath, "utf8");
      const block = FRONTMATTER_BLOCK.exec(source)?.[1] ?? "";
      const meta: PostMeta = {
        draft: DRAFT_FIELD.exec(block)?.[1] === "true",
        pubDatetime: PUB_DATETIME_FIELD.exec(block)?.[1],
        slug: SLUG_FIELD.exec(block)?.[1],
      };

      return `export default ${JSON.stringify(meta)};`;
    },
  };
}
