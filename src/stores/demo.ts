import { atom } from "nanostores";

// 跨框架共享的计数器状态，React 与 Vue island 共用同一 atom
export const counterAtom = atom(0);

// 计数加一
export function incrementCounter() {
  counterAtom.set(counterAtom.get() + 1);
}

// 计数归零
export function resetCounter() {
  counterAtom.set(0);
}
