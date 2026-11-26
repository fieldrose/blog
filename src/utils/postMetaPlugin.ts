import { readFileSync } from "node:fs";

const VIRTUAL_PREFIX = "\0post-meta:";
const FRONTMATTER_BLOCK = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/;
const DRAFT_FIELD = /^draft:\s*(true|false)\s*$/m;
const PUB_DATETIME_FIELD = /^pubDatetime:\s*["']?([^"'\s#]+)/m;
const SLUG_FIELD = /^slug:\s*["']?([^"'\s#]+)/m;

export type PostMeta = {
  draft: boolean;
  pubDatetime: string | undefined;
  /** Content id 后缀：glob 加载器在设置该字段时原样使用 `data.slug`。 */
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
 * 把 markdown 文件的 `?post-meta` 导入解析为其 frontmatter 字段。
 *
 * 服务端路由需要已发布 slug 的白名单，但直接导入真实内容模块会把完整
 * markdown 管线（Shiki 语法、渲染后的 HTML）带进 worker 打包产物。
 * 该插件在构建期读取文件，只产出白名单所需的两个字段。
 *
 * 导入会被改写成不透明的虚拟 id：Astro 自带的 markdown 插件会在 `load`
 * 钩子中接管所有含 `.md`/`.mdx` 扩展名的 id，从而把整条内容重新编译一遍。
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
