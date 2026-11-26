import type { CollectionEntry } from "astro:content";
import { postFilter } from "./postFilter";
import { slugifyStr } from "./slugify";

type Tag = {
  tag: string;
  tagName: string;
};

/**
 * 从文章中构建去重、排序后的标签列表。
 *
 * - 经 `postFilter()` 排除草稿与定时文章
 * - `tag` 为 URL 中使用的 slug，`tagName` 为展示用原始标签
 * - 按 slug 去重，仅大小写不同的标签会合并
 */
export function getUniqueTags(posts: CollectionEntry<"posts">[]) {
  const tags: Tag[] = posts
    .filter(postFilter)
    .flatMap(post => post.data.tags)
    .map(tag => ({ tag: slugifyStr(tag), tagName: tag }))
    .filter(
      (value, index, self) =>
        self.findIndex(tag => tag.tag === value.tag) === index
    )
    .sort((tagA, tagB) => tagA.tag.localeCompare(tagB.tag));
  return tags;
}
