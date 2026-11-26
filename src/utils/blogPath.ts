/**
 * 存放博客文章的目录（相对项目根目录）。
 *
 * 单独成模块，使服务端路由解析文章路径时无需引入 `content.config.ts`，
 * 避免把 `glob()` 内容加载器及其文件系统代码打进运行时打包产物。
 */
export const BLOG_PATH = "src/content/posts";
