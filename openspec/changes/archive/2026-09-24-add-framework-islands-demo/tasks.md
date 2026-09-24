# Tasks: MDX 双框架 Demo

## 1. 依赖与接口

- [x] 1.1 `pnpm add nanostores @nanostores/react @nanostores/vue`
- [x] 1.2 `ReactionTotalsResponse` 类型加入 `src/types/api.ts`
- [x] 1.3 `src/pages/api/reactions/totals.ts`：GET 读 `reaction_totals`，零填充、30s 缓存、503 降级

## 2. 跨框架状态 Demo

- [x] 2.1 `src/stores/demo.ts`：counterAtom + increment/reset
- [x] 2.2 `src/components/react/CounterDemo.tsx` + `src/components/vue/CounterDemo.vue`
- [x] 2.3 `src/components/react/ReactionTotalsDemo.tsx`（自包 QueryProvider）+ `src/components/vue/ReactionTotalsDemo.vue`

## 3. 示例文章与验证

- [x] 3.1 `src/content/posts/examples/framework-islands.mdx`（4 个 client:visible 岛屿 + 说明文字）
- [x] 3.2 check / lint / build 通过；dev 浏览器验证：计数跨框架同步、totals 两岛共 1 次拉取（+1 次 retry）、无 env 两卡均降级
- [x] 3.3 `openspec validate add-framework-islands-demo --strict`
