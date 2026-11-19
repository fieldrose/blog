---
author: Mimas
pubDatetime: 2026-11-18T00:00:00Z
modDatetime: 2026-11-18T00:00:00Z
title: "DOM"
slug: dom
featured: false
draft: false
tags:
  - JavaScript
series: JavaScript
seriesOrder: 10
description: "梳理 DOM 的节点层级与常用节点类型，动态脚本样式与表格操作的接口，NodeList 与 HTMLCollection 的实时性差异，MutationObserver 的异步批量投递，Selectors API 与 Element Traversal，classList、dataset、插入标记等 HTML5 扩展，以及计算样式、元素尺寸、TreeWalker 与 Range 的 DOM2/3 接口。"
---

## Table of contents

## DOM

本篇覆盖 DOM 的节点层级、动态操作、变更观察、选择器与遍历、HTML5 扩展，以及 DOM2/3 的样式、尺寸与遍历接口。DOM 把 HTML 文档映射为节点树，是脚本与页面结构之间的公共契约。

### 1. 节点层级

DOM 把文档表示为多层节点树，所有节点类型都继承自 `Node`，共享 `nodeType`、`nodeName`、`nodeValue`、`parentNode`、`childNodes` 等属性。

| 节点类型 | `nodeType` | `nodeName` 示例 | 说明 |
| --- | --- | --- | --- |
| `Document` | 9 | `#document` | 文档根节点，`document` 即其实例 |
| `DocumentType` | 10 | `html` | 文档类型声明 |
| `Element` | 1 | `DIV` | 标签对应的元素节点 |
| `Text` | 3 | `#text` | 文本内容，空白也算节点 |
| `Comment` | 8 | `#comment` | 注释内容 |
| `DocumentFragment` | 11 | `#document-fragment` | 轻量容器，不进入渲染树 |
| `Attr` | 2 | 属性名 | 属性节点，已不属于文档树 |

```js
const html = document.documentElement; // <html>
html.nodeType; // 1
html.nodeName; // "HTML"
html.parentNode; // #document
html.ownerDocument === document; // true
```

#### 1.1 节点的公共属性

`childNodes` 返回包含文本与注释的 `NodeList`，`children` 只返回元素；`firstChild` 与 `firstElementChild`、`nextSibling` 与 `nextElementSibling` 遵循同样的区分。混用两者是节点遍历出错的常见来源。

```js
const body = document.body;
body.childNodes.length; // includes text and comment nodes
body.children.length; // elements only
body.lastElementChild;
```

#### 1.2 Document 与 Element 的差异

`Document` 提供 `getElementById`、`createElement`、`createTextNode` 等工厂方法，`Element` 只提供自身子树上的查询与属性操作。`document.documentElement` 指向 `<html>`，`document.body` 与 `document.head` 是对应元素的快捷引用。

```js
document.createTextNode("text"); // Text
document.createElement("div"); // HTMLElement
document.doctype; // DocumentType
```

### 2. DOM 编程

#### 2.1 动态脚本与样式

动态创建的 `script` 与 `link` 插入文档后即开始加载。动态脚本默认行为等价于 `async`，需要保持顺序时应显式设置 `script.async = false`。旧版本通过 `readyState` 或 `onreadystatechange` 判断加载状态的写法已不再需要。

```js
const script = document.createElement("script");
script.src = "/widget.js";
document.head.appendChild(script);

const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "/theme.css";
document.head.appendChild(link);
```

#### 2.2 操作表格

`table`、`tbody`、`tr`、`td` 都有专用方法，避免手工拼装节点。`insertRow` 与 `insertCell` 返回新元素，索引为 `-1` 时追加到末尾。

```js
const table = document.querySelector("table");
const row = table.insertRow(-1);
const cell = row.insertCell(0);
cell.textContent = "1";
table.rows.length; // includes thead and tbody rows
```

#### 2.3 NodeList 与 HTMLCollection 的实时性

`querySelectorAll` 返回静态 `NodeList`，结果在调用时刻固化；`getElementsByTagName`、`getElementsByClassName`、`children` 返回实时的 `HTMLCollection` 或 `NodeList`，文档变化会立即反映到集合上。在循环中边遍历边插入节点时，实时集合会导致死循环或遗漏。

```js
const live = document.getElementsByClassName("item"); // live HTMLCollection
const fixed = document.querySelectorAll(".item"); // static NodeList

document.body.appendChild(document.createElement("div"));
// live 长度可能变化，fixed 保持不变
```

### 3. MutationObserver

`MutationObserver` 替代已废弃的 Mutation Events，以异步批量方式投递变更记录。回调在微任务阶段执行，一次回调可携带多条记录，避免同步派发带来的性能开销。

| 配置项 | 观察对象 |
| --- | --- |
| `childList` | 子节点的增删 |
| `subtree` | 扩展到整棵子树 |
| `attributes` + `attributeFilter` | 属性变化，可限定属性名 |
| `characterData` | 文本内容变化 |
| `attributeOldValue` / `characterDataOldValue` | 记录变更前的值 |

```js
const observer = new MutationObserver((records) => {
  for (const record of records) {
    if (record.type === "childList") {
      record.addedNodes; // NodeList
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class"],
});

observer.takeRecords(); // drain pending records
observer.disconnect();
```

`takeRecords` 取出尚未投递的记录并清空队列，`disconnect` 停止观察并丢弃队列。观察器不会阻止变更发生，只负责事后通知。

### 4. Selectors API 与元素遍历

`querySelector` 返回第一个匹配元素，`querySelectorAll` 返回静态 `NodeList`，两者都接受完整的 CSS 选择器。作用域限定在调用元素的后代上，`Element.querySelectorAll` 不包含元素自身。

```js
const panel = document.querySelector("#app .panel");
const items = document.querySelectorAll("li:not(.done)");
panel.querySelector(".title"); // descendant only
```

`matches` 判断元素是否匹配选择器，`closest` 沿祖先链查找最近的匹配元素，两者组合可以替代手工向上遍历。

```js
const item = document.querySelector("li");
item.matches("li.done"); // boolean
item.closest("ul"); // nearest ancestor <ul> or null
```

Element Traversal 提供只含元素的遍历属性：`children`、`childElementCount`、`firstElementChild`、`lastElementChild`、`previousElementSibling`、`nextElementSibling`。相比 `childNodes`，它天然跳过文本与注释节点。

```js
const list = document.querySelector("ul");
list.childElementCount;
list.firstElementChild.nextElementSibling;
```

### 5. HTML5 DOM 扩展

`classList` 提供 `add`、`remove`、`toggle`、`contains`、`replace`，避免手工拼接 `className`。`toggle` 的第二个参数可强制增删。

```js
const el = document.querySelector(".card");
el.classList.toggle("active", isActive);
el.classList.replace("old", "new");
el.className; // string form
```

焦点管理通过 `document.activeElement`、`focus()`、`blur()` 与 `autofocus` 属性完成。`focus()` 默认把元素滚动到可视区域，需要保留滚动位置时传 `{ preventScroll: true }`。

```js
document.activeElement; // currently focused element
input.focus({ preventScroll: true });
document.hasFocus();
```

`dataset` 映射 `data-*` 属性，驼峰与短横线互换，值始终为字符串。插入标记提供 `innerHTML`、`outerHTML`、`insertAdjacentHTML`、`insertAdjacentText`，位置参数为 `beforebegin`、`afterbegin`、`beforeend`、`afterend`。

```js
el.dataset.userId; // reads data-user-id
el.dataset.userId = "42"; // writes data-user-id

list.insertAdjacentHTML("beforeend", "<li>item</li>");
```

`innerHTML` 会重新解析字符串，开销高于节点操作，且插入不可信内容会引入脚本注入风险，纯文本场景应使用 `textContent`。`scrollIntoView` 支持 `block`、`inline`、`behavior` 参数，`behavior: "smooth"` 由浏览器合成滚动动画。

```js
el.scrollIntoView({ block: "center", behavior: "smooth" });
```

### 6. DOM2/3 的样式、遍历与 Range

#### 6.1 样式与计算样式

行内样式通过 `element.style` 读写，属性名为驼峰形式，CSS 自定义属性用 `setProperty`。`getComputedStyle` 返回只读的最终计算值，包含继承与层叠结果，单位已归一。

```js
el.style.backgroundColor = "#2563eb";
el.style.setProperty("--gap", "8px");

const styles = getComputedStyle(el);
styles.marginTop; // resolved value, e.g. "8px"
styles.getPropertyValue("--gap");
```

`document.styleSheets` 暴露样式表集合，`cssRules` 可读取规则，跨域样式表访问规则会抛出 `SecurityError`。

#### 6.2 元素尺寸与位置

`offsetWidth` 与 `offsetHeight` 包含边框与内边距，`clientWidth` 与 `clientHeight` 只含内容与内边距，`scrollWidth` 与 `scrollHeight` 反映溢出后的完整内容尺寸。

```js
el.offsetWidth; // border box
el.clientWidth; // padding box, excludes scrollbar
el.scrollHeight; // content height including overflow

const rect = el.getBoundingClientRect();
rect.top; // relative to viewport
rect.width; // fractional value
```

`getBoundingClientRect` 返回视口坐标的浮点矩形，滚动后需重新取值；`offsetTop` 与 `offsetLeft` 相对 `offsetParent`，两者不可互相替代。

#### 6.3 NodeIterator 与 TreeWalker

两者都按 `whatToShow` 与 `filter` 遍历节点。`NodeIterator` 只有前后移动，`TreeWalker` 支持父子兄弟的完整导航，过滤更灵活。

```js
const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
  acceptNode: (node) =>
    node.tagName === "LI" ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP,
});

let node;
while ((node = walker.nextNode())) {
  // visit each matched <li>
}
```

#### 6.4 Range

`Range` 描述文档中的一段连续内容，可用于选中、提取、克隆与测量。`selectNodeContents` 覆盖元素内部全部内容，`toString` 返回纯文本。

```js
const range = document.createRange();
range.selectNodeContents(el);
range.toString(); // plain text
range.getBoundingClientRect(); // geometry of the range

const clone = range.cloneContents(); // DocumentFragment
```

`range.startContainer` 与 `endContainer` 可为文本节点，偏移以字符计；跨节点比较时需借助 `compareBoundaryPoints`。选区与 `Range` 的对应关系由 `window.getSelection()` 维护，富文本编辑场景直接操作 `Selection` 更为常见。
