import type { CollectionEntry } from "astro:content";

type GroupKey = string | number | symbol;
type GroupFunction<T> = (item: T, index?: number) => GroupKey;

/**
 * 按 groupFunction 返回的分组键聚合文章，返回「分组键 → 文章数组」映射。
 */
export function getPostsByGroupCondition(
  posts: CollectionEntry<"posts">[],
  groupFunction: GroupFunction<CollectionEntry<"posts">>
) {
  const result: Record<GroupKey, CollectionEntry<"posts">[]> = {};

  for (let i = 0; i < posts.length; i++) {
    const item = posts[i];
    const groupKey = groupFunction(item, i);

    if (!result[groupKey]) {
      result[groupKey] = [];
    }

    result[groupKey].push(item);
  }

  return result;
}
