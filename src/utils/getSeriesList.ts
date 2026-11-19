import type { CollectionEntry } from "astro:content";

export type SeriesSummary = {
  name: string;
  count: number;
  /** 专栏内 `seriesOrder` 最小的那篇文章的发布时间，用于排序。 */
  firstDate: Date;
};

/**
 * 按 `series` 字段聚合专栏，供首页区块与 `/series` 索引页共用。
 *
 * 排序依据是专栏首篇文章的发布时间（新专栏优先），首篇按 `seriesOrder`
 * 判定；未声明 `seriesOrder` 的文章排在末尾。
 */
export function getSeriesList(
  posts: CollectionEntry<"posts">[]
): SeriesSummary[] {
  const map = new Map<string, SeriesSummary & { firstOrder: number }>();

  for (const post of posts) {
    const name = post.data.series;
    if (!name) continue;

    const order = post.data.seriesOrder ?? Number.MAX_SAFE_INTEGER;
    const existing = map.get(name);

    if (existing) {
      existing.count++;
      if (order < existing.firstOrder) {
        existing.firstOrder = order;
        existing.firstDate = post.data.pubDatetime;
      }
    } else {
      map.set(name, {
        name,
        count: 1,
        firstDate: post.data.pubDatetime,
        firstOrder: order,
      });
    }
  }

  return Array.from(map.values())
    .map(({ name, count, firstDate }) => ({ name, count, firstDate }))
    .sort((a, b) => b.firstDate.getTime() - a.firstDate.getTime());
}
