import type { CollectionEntry } from "astro:content";
import { postFilter } from "./postFilter";

/**
 * 返回可展示给用户的文章，并按「最后更新时间」倒序排列
 *（存在 `modDatetime` 时使用该字段，否则使用 `pubDatetime`）。
 *
 * 筛选经 `postFilter()` 处理，会排除草稿与未到发布时间的定时文章。
 */
export function getSortedPosts(posts: CollectionEntry<"posts">[]) {
  return posts
    .filter(postFilter)
    .sort(
      (a, b) =>
        Math.floor(
          new Date(b.data.modDatetime ?? b.data.pubDatetime).getTime() / 1000
        ) -
        Math.floor(
          new Date(a.data.modDatetime ?? a.data.pubDatetime).getTime() / 1000
        )
    );
}
