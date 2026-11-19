/**
 * 一级分类的展示信息。
 *
 * 分类本身由文章目录派生（见 `getCategories.ts`），这里只补充目录名无法
 * 表达的展示文案与排序。未登记的目录会回退为目录名本身并排在有 `order`
 * 的分类之后，因此新增目录不需要先改配置才能看到。
 */
export type CategoryMeta = {
  /** 分类页副标题，缺失时不渲染。 */
  description?: string;
  order: number;
};

export const UNCATEGORIZED = "未分类";

export const categoryMeta: Record<string, CategoryMeta> = {
  基础: {
    order: 1,
    description: "语言与计算机基础：网络、数据结构、操作系统。",
  },
  学习记录: {
    order: 2,
    description: "按语言与工程方向整理的系统笔记。",
  },
  项目经历: {
    order: 3,
    description: "真实项目的重构、迁移与发布复盘。",
  },
  其他: {
    order: 4,
    description: "写作语法、站点维护与杂项记录。",
  },
  [UNCATEGORIZED]: {
    order: 99,
    description: "尚未归入分类的文章。",
  },
};
