import { useStore } from "@nanostores/react";
import { counterAtom, incrementCounter, resetCounter } from "@/stores/demo";

/**
 * React 19 island bound to the framework-agnostic nanostores atom.
 * Paired with the Vue CounterDemo on the framework-islands demo article.
 */
export default function CounterDemo() {
  const count = useStore(counterAtom);

  return (
    <div className="border-border my-4 rounded-lg border p-4">
      <p className="mb-3 text-sm">
        <span className="bg-muted rounded px-2 py-0.5 text-xs">React 19</span>
      </p>
      <p className="mb-3 text-2xl font-bold" aria-live="polite">
        Count: {count}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className="focus-outline border-border hover:border-accent rounded-md border px-3 py-1 text-sm"
          onClick={incrementCounter}
        >
          +1
        </button>
        <button
          type="button"
          className="focus-outline border-border hover:border-accent rounded-md border px-3 py-1 text-sm"
          onClick={resetCounter}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
