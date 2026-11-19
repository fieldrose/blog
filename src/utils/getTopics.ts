import type { CollectionEntry } from "astro:content";
import { topics, type Topic } from "@/data/topics";

export type ResolvedTopicItem = {
  post: CollectionEntry<"posts">;
  note?: string;
};

export type ResolvedTopic = Omit<Topic, "items"> & {
  items: ResolvedTopicItem[];
};

/**
 * 把专题声明解析为真实文章。
 *
 * - 引用了不存在的 id：构建期抛错并指出 id 与专题，避免静默丢项
 * - 引用了草稿：跳过渲染并给出提示
 */
export function resolveTopics(
  posts: CollectionEntry<"posts">[]
): ResolvedTopic[] {
  const byId = new Map(posts.map(post => [post.id, post]));

  return topics.map(topic => ({
    ...topic,
    items: topic.items.flatMap(item => {
      const post = byId.get(item.id);
      if (!post) {
        throw new Error(
          `[topics] 专题「${topic.title}」引用了不存在的文章 id: ${item.id}`
        );
      }
      if (post.data.draft) {
        console.warn(
          `[topics] 专题「${topic.title}」引用的文章仍为草稿，已跳过: ${item.id}`
        );
        return [];
      }
      return [{ post, note: item.note }];
    }),
  }));
}
