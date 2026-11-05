import type { Directive } from "vue";

/**
 * v-skeleton：加载态占位指令。
 *
 *   <div v-skeleton="loading">真实内容</div>
 *
 * - value 为 true：宿主内容被骨架节点替换，并标记 aria-busy
 * - value 为 false：骨架节点移除，原始子节点按原顺序放回
 *
 * 指令只操作 DOM、不持有响应式状态，所以在任意组件里都能复用；
 * 骨架节点所需的 .sk-* 样式由使用方组件提供（本目录的 Demo.vue）。
 */

interface SkeletonState {
  /** 指令挂载时宿主元素的原始子节点，加载结束后原样放回 */
  nodes: Node[];
  /** 当前是否已处于骨架态，用于避免重复替换 */
  active: boolean;
}

const states = new WeakMap<HTMLElement, SkeletonState>();

/** 与 Demo.vue 中 .sk-* 样式配套的骨架结构 */
function createSkeleton(): HTMLElement {
  const root = document.createElement("div");
  root.className = "sk-skeleton";
  root.setAttribute("aria-hidden", "true");
  root.innerHTML = `
    <div class="sk-head">
      <div class="sk sk-avatar"></div>
      <div class="sk-head-lines">
        <div class="sk sk-line sk-w60"></div>
        <div class="sk sk-line sk-w40"></div>
      </div>
    </div>
    <div class="sk sk-block"></div>
    <div class="sk sk-line sk-w90"></div>
    <div class="sk sk-line sk-w75"></div>
  `;
  return root;
}

function apply(el: HTMLElement, loading: boolean) {
  const state = states.get(el);
  if (!state || state.active === loading) return;

  state.active = loading;
  el.setAttribute("aria-busy", String(loading));
  el.replaceChildren(...(loading ? [createSkeleton()] : state.nodes));
}

export const vSkeleton: Directive<HTMLElement, boolean> = {
  mounted(el, binding) {
    // 先记录原始内容，再按初始值决定是否切换为骨架
    states.set(el, { nodes: Array.from(el.childNodes), active: false });
    apply(el, Boolean(binding.value));
  },
  updated(el, binding) {
    // 每次更新都走 apply，内部用 active 做幂等判断
    apply(el, Boolean(binding.value));
  },
  beforeUnmount(el) {
    states.delete(el);
  },
};
