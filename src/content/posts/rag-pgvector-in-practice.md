---
author: Mimas
pubDatetime: 2026-06-22T16:30:00Z
title: "RAG 工程化落地：文档切分、Embedding、pgvector 召回与重排"
slug: rag-pgvector-in-practice
featured: false
draft: false
tags:
  - AI
  - RAG
  - PostgreSQL
  - pgvector
description: "把大模型问答从 Demo 做到能用，工作量全在检索链路上：文档清洗与切分策略、embedding-3 向量化、pgvector 索引选型、召回召回率评估、Cross-Encoder 重排与上下文组装的完整实践。"
---

做一个"基于内部文档问答"的功能，Demo 阶段只需要几十行代码：切片、转向量、相似度排序、塞进 prompt。但上线后发现它"看起来在工作、经常答不对"——召回不全、切分切碎了语义、top-k 里混着无关段落。RAG 的工程含量几乎全在**检索链路**上。这篇记录一条生产可用链路的完整决策。

## Table of contents

## 一、整体链路

```text
原始文档 → 清洗解析 → 切分(Chunking) → Embedding → 向量库(pgvector)
                                                   ↓
用户问题 → Query 改写 → 向量召回(粗排) → 重排(精排) → 上下文组装 → LLM → 答案 + 引用
```

向量库我们直接选了 PostgreSQL + pgvector，而不是独立向量数据库：业务数据、权限元数据、向量在同一个库里，用一条 SQL 就能做"向量相似度 + 结构化过滤（权限、时间、栏目）"的联合查询，运维零新增组件。

## 二、清洗与切分：决定召回质量的第一步

垃圾进、垃圾出。原始文档（PDF/Word/HTML/Markdown）先统一清洗：去页眉页脚、目录、重复水印、连续空行，表格转成 Markdown 或键值文本，代码块整体保留不拆。

切分策略试过三种：

1. **固定长度 + overlap**：按 token 数硬切（如 500 token、重叠 50）。实现最简单，但经常把一个论点或一段代码切成两半；
2. **递归结构切分**：优先按标题层级（`#`/`##`）切，超长再按段落、最后才按句子回退。语义完整度明显更好，是最终主方案；
3. **语义切分**：相邻句向量变化大时断开。理论上最优，但计算成本高、边界不稳定，只在少量高质量语料上用。

实践经验：**chunk 不是越小越好**。太小会丢失上下文（一个结论的前提和结论被分到两块），太大会稀释相似度。知识文档用 300–600 token、保留 10% 重叠比较稳。每个 chunk 同时落三类元数据：来源文档、章节路径（`指南 > 安装 > 故障排除`）、权限范围。

切完后做一次"可回答性"清洗：纯目录页、版权页直接丢弃。

## 三、Embedding：模型选择与入库

向量模型用 embedding-3，关键决策点：

- **维度与成本的权衡**：维度越高检索越细，但存储和索引成本越高。内部知识库规模用 1024 维足够；
- **中文为主的语料选强中文模型**，不要只看 MTEB 英文榜；
- **查询和文档必须用同一个模型**，embedding 空间不可跨模型混用。

pgvector 建表：

```sql
create extension if not exists vector;

create table doc_chunks (
  id          bigint generated always as identity primary key,
  doc_id      bigint not null references docs(id) on delete cascade,
  heading     text,
  content     text not null,
  embedding   vector(1024) not null,
  scope       text not null default 'public',
  created_at  timestamptz not null default now()
);
```

入库时对向量做归一化，配合余弦距离（或直接用内积，等价于归一化后的余弦）。

## 四、索引：小表顺序扫，大表上 ANN

这是最常见的误区：**不是建了向量字段就必须建索引**。pgvector 顺序扫描在几十万行内完全可以接受，且召回 100% 精确。真正上量后再建近似最近邻索引：

```sql
-- HNSW：查询延迟低、内存占用高，适合在线问答
create index on doc_chunks
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- IVFFlat：构建快、内存省，但需要先有数据再建索引并合理选 lists
-- create index on doc_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
```

查询时用 `probes`（IVFFlat）或 `hnsw.ef_search` 调"查得快 vs 查得全"：

```sql
set local hnsw.ef_search = 80;

select content, heading,
       1 - (embedding <=> $1) as score
from doc_chunks
where scope = any($2)          -- 结构化权限过滤
order by embedding <=> $1
limit 20;
```

`<=>` 是余弦距离，`<->` 是 L2，`<#>` 是负内积，按归一化策略对应选择。

## 五、召回：top-k 不等于够用

粗排只取 top-k 会有两个系统性问题：向量相似度对"字面不同、语义相同"敏感，却也容易被"话题相近但答非所问"的段落骗到；用户问题往往很短，信息密度低。两个改进：

1. **Query 改写 / 多路召回**：让 LLM 把口语问题改写成检索友好的查询，并生成 2–3 个同义子查询分别召回后合并；对术语、缩写做同义词扩展；
2. **粗排多取**：ANN 取 20–50 条交给下一阶段，而不是直接取 5 条。

检索质量必须量化，不能凭感觉：我们建了一个 100 条标注问题的评测集（每条标注应该命中的 chunk），持续跟踪 **Recall@k**（前 k 条里覆盖正确答案的比例）。任何切分参数、模型、索引参数的调整都先过评测集，防止"优化了 A、退化了 B"。

## 六、重排：Cross-Encoder 决定最终顺序

向量召回是双塔模型，query 和 document 独立编码，速度快但交互浅。精排换用 **Cross-Encoder**：把 query 和每个候选 chunk 拼在一起过模型，输出相关性分数，质量高一个档次，代价是候选越多越慢——所以它只处理粗排捞出的几十条。

```text
问题 + 候选1 → Cross-Encoder → 0.91
问题 + 候选2 → Cross-Encoder → 0.37
...
取分数前 6 条进入上下文
```

同时叠加规则信号：关键词命中率（BM25 分数与向量分做加权融合）、chunk 更新时间、文档权威性权重。纯语义检索对专有名词、错误码这类关键词场景偏弱，**向量 + 关键词混合召回 + Cross-Encoder 精排**是线上效果最稳的组合。

## 七、上下文组装与防幻觉

进入 prompt 前还有三件事：

1. **去重与压缩**：同一文档相邻 chunk 合并，超预算时按精排分数截断，而不是按召回顺序；
2. **带来源**：每段标注编号与出处，要求模型回答时引用 `[1] [2]`，前端展示可点击来源。无法从上下文得出的问题，明确回答"资料中未找到"，而不是编；
3. **对话历史处理**：多轮问答先做指代消解（"那它的并发量呢？"→补全为完整问题），避免直接拿短句去检索。

## 八、写在最后

RAG 的难度曲线是反直觉的：接入只需要一天，做好需要一个迭代周期。真正决定效果的不是模型多大，而是**切分是否保住语义、召回是否评测驱动、精排是否舍得花算力、答案是否带着可核验的引用**。把这四件事做扎实，小模型 + 好检索的效果可以稳定超过大模型 + 裸检索。
