/**
 * Mermaid 图表点击放大
 *
 * 点击 inline SVG 后弹出全屏蒙层，克隆 SVG 居中放大显示。
 * 完全独立于父页面：不修改 body、不干扰原滚动位置。
 * 交互：点击蒙层 / ESC 关闭，有平滑过渡。
 */

const SELECTOR = ".app-prose svg[id^='mermaid-']";

interface ActiveState {
  overlay: HTMLDivElement;
  close: () => void;
  // 用于拦截移动端 touchmove 防止穿透滚动
  onTouchMove: (e: TouchEvent) => void;
  onKeyDown: (e: KeyboardEvent) => void;
}

let active: ActiveState | null = null;

function setup() {
  document.querySelectorAll<SVGSVGElement>(SELECTOR).forEach(svg => {
    if (svg.dataset.zoomBound) return;
    svg.dataset.zoomBound = "1";
    svg.style.cursor = "zoom-in";
    svg.addEventListener("click", () => open(svg));
  });
}

function open(src: SVGSVGElement) {
  if (active) return;

  const overlay = document.createElement("div");
  overlay.className = "mermaid-zoom-overlay";

  const clone = src.cloneNode(true) as SVGSVGElement;
  clone.removeAttribute("width");
  clone.removeAttribute("style");
  clone.classList.add("mermaid-zoom-svg");

  overlay.appendChild(clone);
  document.body.appendChild(overlay);

  // 强制重排后触发过渡
  requestAnimationFrame(() => {
    overlay.classList.add("mermaid-zoom-overlay--show");
  });

  // 阻止移动端 touchmove 穿透到下层页面（桌面端 fixed overlay 天然隔离）
  const onTouchMove = (e: TouchEvent) => e.preventDefault();
  overlay.addEventListener("touchmove", onTouchMove, { passive: false });

  const close = () => {
    if (!active) return;
    overlay.classList.remove("mermaid-zoom-overlay--show");
    const onEnd = () => {
      overlay.remove();
      active = null;
    };
    // 用 timeout 兜底 transitionend（用户设了 prefers-reduced-motion 或 CSS 禁用过渡时）
    overlay.addEventListener("transitionend", onEnd, { once: true });
    setTimeout(onEnd, 400);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  overlay.addEventListener("click", close);
  document.addEventListener("keydown", onKeyDown);

  active = { overlay, close, onTouchMove, onKeyDown };
}

// ======== 绑定 ========

document.addEventListener("astro:page-load", setup);
document.addEventListener("astro:after-swap", setup);

if (document.readyState !== "loading") {
  setup();
} else {
  document.addEventListener("DOMContentLoaded", setup);
}
