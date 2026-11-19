import type { CollectionEntry } from "astro:content";
import { BLOG_PATH } from "@/content.config";
import { categoryMeta, UNCATEGORIZED } from "@/data/categories";
import { postFilter } from "./postFilter";

export type ParsedCategory = {
  category: string;
  subcategory?: string;
};

export type CategoryNode = {
  name: string;
  /** 路由参数，沿用中文分类名，不做 kebab-case 转换。 */
  slug: string;
  count: number;
  children: { name: string; slug: string; count: number }[];
};

/**
 * 从文章文件路径推导两级分类。
 *
 * 目录名以 `_` 前缀参与排序与视觉分隔，因此先剥离该前缀：
 * - `_基础/_操作系统/x.md`            → 基础 / 操作系统
 * - `_项目经历-前端项目重构/x.md`      → 项目经历 / 前端项目重构
 * - `_其他/x.md`                      → 其他
 * - `x.md`（根目录）                  → 未分类
 */
export function parseCategoryFromPath(
  filePath: string | undefined
): ParsedCategory {
  const segments = (filePath ?? "")
    .replace(BLOG_PATH, "")
    .split("/")
    .filter(Boolean)
    .slice(0, -1) // 去掉文件名
    .map(segment => segment.replace(/^_/, ""));

  const [head, ...rest] = segments;
  if (!head) return { category: UNCATEGORIZED };

  if (rest.length > 0) {
    return { category: head, subcategory: rest.join(" / ") };
  }

  // 单层目录时允许用 `-` 在目录名内表达二级分类
  const [name, ...tail] = head.split("-");
  return tail.length > 0
    ? { category: name, subcategory: tail.join(" / ") }
    : { category: head };
}

function orderOf(name: string): number {
  return categoryMeta[name]?.order ?? Number.MAX_SAFE_INTEGER;
}

/**
 * 聚合一二级分类树。草稿与未到发布时间的文章不计入统计。
 */
export function getCategoryTree(
  posts: CollectionEntry<"posts">[]
): CategoryNode[] {
  const map = new Map<
    string,
    { count: number; children: Map<string, number> }
  >();

  for (const post of posts) {
    if (!postFilter(post)) continue;

    const { category, subcategory } = parseCategoryFromPath(post.filePath);
    const node = map.get(category) ?? { count: 0, children: new Map() };
    node.count++;
    if (subcategory) {
      node.children.set(subcategory, (node.children.get(subcategory) ?? 0) + 1);
    }
    map.set(category, node);
  }

  return Array.from(map.entries())
    .map(([name, { count, children }]) => ({
      name,
      slug: name,
      count,
      children: Array.from(children.entries())
        .map(([childName, childCount]) => ({
          name: childName,
          slug: childName,
          count: childCount,
        }))
        .sort(
          (a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh")
        ),
    }))
    .sort(
      (a, b) => orderOf(a.name) - orderOf(b.name) || a.name.localeCompare(b.name, "zh")
    );
}
