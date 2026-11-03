---
author: Mimas
pubDatetime: 2026-11-03T12:00:00Z
modDatetime: 2026-11-03T12:00:00Z
title: "项目引入 Vitest 与 Hooks 测试演进"
slug: 项目引入 Vitest
featured: false
draft: false
tags:
  - Vitest
  - Vue3
  - 工程化
  - 项目经历
series: 项目经历-前端项目重构
seriesOrder: 6
description: "重构项目从无测试到引入 Vitest 的完整思考过程：从挂载整个 SFC 做断言起步，因业务迭代导致测试维护成本逐步升高，最终通过抽离 Vue Hooks 将测试粒度下沉到可独立验证的业务逻辑单元。"
---

## Table of contents

## 一、背景

重构项目稳定在 Vue 3 + Vite + TypeScript 技术栈后，测试能力始终为零。日常改完代码靠浏览器手动点一遍验证，一次改多个文件时容易遗漏边界 case。决定引入测试框架，选择 Vitest 没有太多纠结——同属 Vite 生态、配置量最少、启动速度最快。

环境选型上有一个小决策：`happy-dom` 启动更快，但项目中的组件用了 `ResizeObserver` 做响应式列宽计算，`happy-dom` 对该 API 的支持不完整，首次跑组件测试时就挂了。换成 `jsdom` 后解决，速度上多出的几百毫秒在项目规模下可以接受。

```ts
// vite.config.ts 里的测试配置
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    coverage: { provider: "v8", reporter: ["text", "html"] },
  },
});
```

## 二、第一阶段：对 SFC 整体写挂载测试

Vitest 跑通后，测试的起点只能是挂载完整组件、断言最终渲染结果。没有拆分、没有前置设计，组件承载了所有业务逻辑，测试自然也只能覆盖整体行为。

```ts
// 挂载测试的基本形态——mock 接口 → mount 组件 → 触发交互 → 断言 DOM
import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import PageView from "@/views/order/PageView.vue";

vi.mock("@/api/order", () => ({
  fetchOrderList: vi.fn().mockResolvedValue([
    { id: 1, amount: 100, status: "paid" },
    { id: 2, amount: 200, status: "paid" },
  ]),
}));

describe("PageView", () => {
  it("切换时间范围后渲染汇总数值", async () => {
    const wrapper = mount(PageView);
    await wrapper.find('[data-testid="range-30d"]').trigger("click");
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="summary-total"]').text()).toBe(
        "300.00"
      );
    });
  });
});
```

`vi.mock` 在 Vitest 里会自动 hoisting 到文件顶部，不需要手动处理模块加载顺序。`vi.waitFor` 是 Vitest 提供的轮询断言，比手写 `await new Promise` 更稳。这些细节都是上手时踩过坑才记住的。

这种写法跑通简单，成本低。但测试断言天然耦合在 DOM 结构和展示格式上——用 `data-testid` 找元素、断言页面上显示的字符串值。

## 三、维护成本随迭代暴露

挂载测试跑通后前几周没出问题。业务迭代加快后，问题逐渐显现：

- 展示格式调整（加千分位、改货币符号）导致断言字符串挂起，但计算逻辑本身没变
- DOM 结构调整（拆子组件、改标签）导致 `wrapper.find` 找不到元素
- 新增边界 case 成本高：每个 case 都要走一遍 mock → 挂载 → 等待渲染 → 断言的固定流程

核心矛盾不在"挂载测试写错了"——挂载测试有其适用场景。问题在于业务逻辑和渲染逻辑放在同一个单元里测试，而 DOM 结构和展示格式恰恰是业务迭代中变化最频繁的部分。**很多测试是根据页面文字或节点写死的，业务一变，配套测试也需要跟着反复修改**。

## 四、第二阶段：抽离 Hooks，测试随之下沉

维护成本暴露后，开始将组件内的业务逻辑从 SFC 中剥离为独立 Hooks。抽离有三个明确目标：

**一、解耦**。接口请求、状态管理、计算逻辑从模板和生命周期中剥离，SFC 只负责渲染和事件分发。

**二、复用**。项目中多个同类组件共享相同的数据流形态，抽离后的 Hook 直接复用，新页面只需组合现有 Hooks 并传入业务参数。

**三、降低测试维护成本**。业务逻辑从组件中分离后，可以直接针对 Hook 本身写测试——传入一组数据，断言返回值。不再需要挂载组件、等待渲染、断言最终页面上的字符串。

抽离后的 Hook 形态：

```ts
// src/hooks/order/useOrderSummary.ts
export function useOrderSummary(items: Ref<OrderItem[]>) {
  const total = computed(() =>
    items.value.reduce((acc, item) => acc + item.amount, 0)
  );
  const totalWithFee = computed(() => +(total.value * 1.06).toFixed(2));
  return { total, totalWithFee };
}
```

Hook 的单元测试不再需要 mount 组件、不再需要 vi.mock：

```ts
import { describe, it, expect } from "vitest";
import { ref } from "vue";
import { useOrderSummary } from "@/hooks/order/useOrderSummary";

describe("useOrderSummary", () => {
  it("计算汇总值与含费总计", () => {
    const items = ref([
      { id: 1, amount: 100 },
      { id: 2, amount: 200 },
    ]);
    const { total, totalWithFee } = useOrderSummary(items);
    expect(total.value).toBe(300);
    expect(totalWithFee.value).toBe(318); // 300 * 1.06
  });

  it("空输入返回 0", () => {
    const { total } = useOrderSummary(ref([]));
    expect(total.value).toBe(0);
  });

  it("响应 items 变化", () => {
    const items = ref([{ id: 1, amount: 100 }]);
    const { total } = useOrderSummary(items);
    items.value.push({ id: 2, amount: 50 });
    expect(total.value).toBe(150);
  });
});
```

三条断言覆盖了核心路径：正常计算、边界条件、响应式更新。没有 DOM、没有接口 mock、没有等待渲染——测试的只是 Hook 本身的逻辑正确性。如果将来展示格式改成千分位、汇总口径调整、组件拆分成子组件，这三条测试都不会挂。

挂载测试收敛到少数真正关心渲染行为的场景（比如表格列显隐切换、筛选器交互），数量从 12 条降到 3 条，维护成本稳定。

## 五、演进路径总结

```
引入 Vitest
  ├─ 环境决策：happy-dom vs jsdom → ResizeObserver 需求定 jsdom
  └─ 第一阶段：mount SFC → vi.mock 接口 → vi.waitFor → 断言 DOM 字符串
       └─ 迭代加快后：展示格式变 / DOM 结构变 → 断言挂起 → 维护成本随业务增长

抽离 Hooks（三个目标：解耦 / 复用 / 降测试维护）
  └─ 第二阶段：import Hook → ref 输入 → expect computed.value
       └─ 挂载测试收敛到纯渲染交互场景
```

**判断标准**：改动业务逻辑时，挂起的测试是否只涉及业务层的断言——如果还在因为 DOM 结构或渲染格式挂起，说明 Hook 抽离还不彻底。

## 六、当前状态

落地后测试覆盖逐步推进，Hook 单元测试覆盖 8 个模块，全量跑完 ~4 秒。CI 中 lint → test:run → build → deploy 一条龙，测试成为合入前置条件。

核心收益不在"多了一层测试"，而在**组件结构与业务逻辑之间的边界被明确下来**——改业务逻辑知道去哪里改、改完改哪里验证；新增页面知道复用哪个 Hook，不再复制粘贴。这条分界线的意义比测试本身更长期。
