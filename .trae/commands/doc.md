---
description: 生成符合项目统一规范的技术文档或博客文章（blog / tech）
---

调用 doc-gen skill，以「$ARGUMENTS」为文档主题执行完整生成流程：

1. 从 $ARGUMENTS 推断文档类型（blog / tech），无法确定时询问用户一次。
2. 开头注入「项目背景」区块，正文遵循全部已固化规则。
3. 对照 90-checklist 自检，修正后输出并附自检结论。
