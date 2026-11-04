# 40 · 结构与格式要求

> 维护说明：修改规则请直接编辑本文件，所有文档生成流程自动生效。

## 已固化规则

- **F1 背景前置**：文档开头必须包含「项目背景」区块（模板见 00-context.md），体系强制项，不可省略。
- **F2 类型明确**：产出时必须确定文档类型（blog / tech），类型附加要求见 00-context.md「文档类型参数」。
- **F3 frontmatter 模板**：blog 类型固定字段如下，顺序不可调换；注释中 `*` 标注专栏才需出现的字段。

```yaml
---
author: Mimas
pubDatetime: YYYY-MM-DDTHH:mm:ssZ       # UTC，首次发布时间
modDatetime: YYYY-MM-DDTHH:mm:ssZ       # UTC，最近修改时间
title: "标题"                            # 引号包裹
slug: 标题                               # 中文，与 title 一致
featured: false                          # 是否在首页 featured 区域展示
draft: false
tags:
  - 标签1
  - 标签2
series: 系列名-描述                      # *仅专栏文章出现
seriesOrder: 1                           # *仅专栏文章出现，整数递增
description: "一句话压缩文章核心"         # 见 F7 密度要求
---
```

- **F4 slug 规则**：blog 类型的 slug 字段为中文，与 title 原文一致，不加 kebab-case 转换。
- **F5 TOC 占位**：frontmatter 之后固定写一行 `## Table of contents`（由 remark-toc 自动填充），无论文章长短均不省略。
- **F6 章节编号**：一级章节使用中文数字序号（## 一、...、## 二、...），子章节使用阿拉伯数字编号（### 3.1 ...、### 3.2 ...）。无编号的一级章节仅在引言、结论等少量场景使用。
- **F7 description 密度**：一句话压缩文章核心（主题 + 关键论点 + 结论方向 / 实践要点），禁止空泛套话（如「本文介绍了 XXX」「分享一点 XXX 心得」）。参考示例："译自 Max Stoiber 的 How To Scale React Applications，整理其中与文件组织相关的部分：容器与组件分离、按功能分组、CSS Modules 与组件级 reset、saga 作为跨组件协作层，并附一份后续技术演变的对照说明。"
- **F8 专栏命名**：series 字段格式为「系列名-描述」（如 `项目经历-前端项目重构`），seriesOrder 从 1 开始整数递增；删除专栏时剩余文章 seriesOrder 自动顺延。

## 待补充（由用户逐条确认后转为正式条目）

- 标题层级最大深度（目前支持到 ### 三级，是否需要 #### 四级？）
- 文件命名与落盘路径约定（blog 类型是否固定落在 `src/content/posts/` 下，文件名与 slug 的关系）
- 外部引用格式（是否要求统一为脚注、行内链接还是 Markdown 参考链接）
- 图片资源存放与引用规范

## 自检项（同步至 90-checklist）

- [ ] 开头含项目背景区块（F1）
- [ ] 文档类型明确且附加要求已满足（F2）
- [ ] frontmatter 字段与顺序符合 F3（专栏额外含 series + seriesOrder）
- [ ] slug 为中文且与 title 一致（F4）
- [ ] frontmatter 之后固定有 `## Table of contents` 占位（F5）
- [ ] 章节编号符合 F6（一级中文数字，子级阿拉伯数字）
- [ ] description 密度符合 F7（有具体论点与方向，无空泛套话）
- [ ] 专栏命名符合 F8（series 格式、seriesOrder 递增）
