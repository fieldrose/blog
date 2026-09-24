import { atom } from "nanostores";

/**
 * Framework-agnostic shared UI state for the framework-islands demo article.
 * React (`@nanostores/react`) and Vue (`@nanostores/vue`) islands subscribe
 * to the same module-level atom, proving cross-framework state sharing.
 */
export const counterAtom = atom(0);

export function incrementCounter() {
  counterAtom.set(counterAtom.get() + 1);
}

export function resetCounter() {
  counterAtom.set(0);
}
