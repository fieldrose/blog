import { useState } from "react";

/**
 * React 19 island 示例：
 * - framework: "react" → 在 .astro 里会以 client:visible 挂载
 * - 组件内部完全是 React 生态（useState / Tailwind class）
 * - 只渲染舞台内部内容（外壳由 DemoCard.astro 提供）
 */
export default function Demo() {
  const [count, setCount] = useState(0);

  return (
    <div className="stage-inner">
      <div className="flex flex-col items-center gap-3">
        <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          React 19 · useState
        </span>
        <span className="text-3xl font-bold tabular-nums" aria-live="polite">
          {count}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded border border-border px-3 py-1 text-sm hover:border-accent focus:outline-accent"
            onClick={() => setCount((c) => c + 1)}
          >
            +1
          </button>
          <button
            type="button"
            className="rounded border border-border px-3 py-1 text-sm hover:border-accent focus:outline-accent"
            onClick={() => setCount(0)}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
