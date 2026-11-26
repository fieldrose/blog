/**
 * Mermaid 图表客户端渲染
 *
 * 构建期渲染依赖 Playwright 的 Chromium，而 CI 构建环境（Cloudflare Workers
 * Builds、Netlify）不提供浏览器；Astro 的内容加载器只会记录失败并留下空正文，
 * 导致带图表的文章整页内容为空。因此构建阶段只输出 `<pre class="mermaid">`
 * 源码，由这里在浏览器中按需加载 mermaid 并渲染为 SVG。
 */

const SELECTOR = ".app-prose pre.mermaid";

type Mermaid = typeof import("mermaid").default;

let mermaidPromise: Promise<Mermaid> | null = null;

function loadMermaid(): Promise<Mermaid> {
  mermaidPromise ??= import("mermaid").then(({ default: mermaid }) => {
    mermaid.initialize({
      startOnLoad: false,
      // "base" 让配色由 global.css 中的 CSS token 覆盖驱动，
      // 图表因此无需重渲染即可跟随明暗主题。
      theme: "base",
      fontFamily: "inherit",
    });
    return mermaid;
  });

  return mermaidPromise;
}

async function renderDiagrams(): Promise<void> {
  const blocks = Array.from(
    document.querySelectorAll<HTMLElement>(SELECTOR)
  ).filter(block => !block.querySelector("svg"));

  if (blocks.length === 0) return;

  try {
    const mermaid = await loadMermaid();
    await mermaid.run({ nodes: blocks });
    document.dispatchEvent(new CustomEvent("mermaid:rendered"));
  } catch (error) {
    // 渲染失败时保留图表源码，避免整块内容消失。
    // eslint-disable-next-line no-console
    console.error("Failed to render Mermaid diagrams", error);
  }
}

/** 串行化渲染：并发执行时 mermaid 会重复处理同一块图表。 */
let rendering: Promise<void> | null = null;

function scheduleRender(): void {
  rendering ??= renderDiagrams().finally(() => {
    rendering = null;
  });
}

document.addEventListener("astro:page-load", scheduleRender);

if (document.readyState !== "loading") {
  scheduleRender();
} else {
  document.addEventListener("DOMContentLoaded", scheduleRender);
}

export {};
