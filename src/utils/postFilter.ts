import type { CollectionEntry } from "astro:content";
import config from "@/config";

/**
 * 判断文章是否允许被列出或渲染。
 *
 * - 始终排除草稿
 * - 生产环境下，发布时间（减去配置的提前量）未到的定时文章会被排除
 * - 开发环境下始终显示非草稿文章，便于撰写
 */
export function postFilter({ data }: CollectionEntry<"posts">) {
  const isPublishTimePassed =
    Date.now() >
    new Date(data.pubDatetime).getTime() - config.posts.scheduledPostMargin;
  return !data.draft && (import.meta.env.DEV || isPublishTimePassed);
}
