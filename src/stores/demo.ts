import { atom } from "nanostores";

// 拟一个计数器状态
export const counterAtom = atom(0);

export function incrementCounter() {
  counterAtom.set(counterAtom.get() + 1);
}

export function resetCounter() {
  counterAtom.set(0);
}
