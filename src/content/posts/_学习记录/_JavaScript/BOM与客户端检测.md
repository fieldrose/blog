---
author: Mimas
pubDatetime: 2026-11-18T00:00:00Z
modDatetime: 2026-11-18T00:00:00Z
title: "BOM与客户端检测"
slug: bom与客户端检测
featured: false
draft: false
tags:
  - JavaScript
series: JavaScript
seriesOrder: 9
description: "梳理浏览器对象模型与客户端检测：window 的全局作用域、窗口关系、尺寸与定时器，location 的导航语义、navigator 的能力属性、screen 与 history 的接口，以及以能力检测替代 UA 判断的理由和 UA 字符串、硬件信息在实践中的局限。"
---

## Table of contents

## BOM与客户端检测

本篇覆盖 BOM 的核心对象与客户端检测的取舍。BOM 没有统一规范，各对象的行为由浏览器实现约定；客户端检测则决定代码如何在不依赖浏览器品牌的前提下判断能力是否可用。

### 1. window 对象

#### 1.1 全局作用域

`window` 是浏览器中的全局对象，全局声明的 `var` 变量与函数声明会成为它的属性。

```js
var name = "Mimas";
console.log(window.name); // Mimas

let count = 1;
console.log(window.count); // undefined
```

- `var` 与函数声明挂到 `window` 上，`let`、`const`、`class` 不会。
- 访问未声明变量会抛 `ReferenceError`，访问 `window` 上不存在的属性只返回 `undefined`。
- `window` 上已有同名属性时，`var` 声明不会覆盖，赋值才会修改原属性。

#### 1.2 窗口关系

```js
window.top;
window.parent;
window.self;
window.frames[0];
```

- `top` 指向最外层窗口，`parent` 指向直接父窗口，`self` 指向当前窗口。
- 同源窗口之间可以互相访问 `document` 与变量，跨源访问受同源策略限制。
- 内嵌 `iframe` 的 `window` 通过 `contentWindow` 获取，`frameElement` 反向取得宿主元素。

#### 1.3 位置与尺寸

```js
window.screenX;
window.screenY;
window.screenLeft;
window.screenTop;
window.devicePixelRatio;

window.innerWidth;
window.innerHeight;
document.documentElement.clientWidth;
```

- `screenX`/`screenY` 与 `screenLeft`/`screenTop` 表示窗口相对屏幕的位置，各浏览器对边框的计算口径不同。
- `devicePixelRatio` 是物理像素与 CSS 像素的比值，用于适配高分屏与 canvas 绘制。
- `innerWidth`/`innerHeight` 包含滚动条区域，`documentElement.clientWidth` 不包含，布局计算以后者为准更稳定。

#### 1.4 导航与新窗口

```js
const win = window.open("https://example.com", "_blank", "noopener,noreferrer");
win.opener = null;
```

- `window.open` 返回新窗口的引用，被弹窗拦截时返回 `null`。
- 新窗口默认可以通过 `opener` 反向访问打开者，跨源场景应设置 `noopener` 切断引用。
- 弹出窗口需要用户手势触发，非交互场景调用会被浏览器拦截。

#### 1.5 定时器

```js
const timer = setTimeout(() => {
  // run once
}, 100);

const interval = setInterval(() => {
  // run repeatedly
}, 1000);

clearTimeout(timer);
clearInterval(interval);
```

- 定时器延迟是最小等待时间，不是精确执行时间，主线程繁忙时回调会延后。
- 嵌套层级超过 5 层的 `setTimeout` 最小延迟被提升到 4ms，后台标签页还会进一步节流。
- `setInterval` 不保证回调之间的间隔，回调耗时长于周期时会出现堆积，需要串行调度时用递归 `setTimeout`。

#### 1.6 系统对话框

```js
alert("saved");
const ok = confirm("continue?");
const input = prompt("name?", "default");
```

- 三种对话框都是同步阻塞的，执行期间脚本暂停、页面停止渲染。
- 样式不可定制，部分浏览器在特定场景下会抑制弹窗或改为非阻塞提示。
- 生产界面应使用自定义模态组件，系统对话框只适合调试与极简确认。

### 2. location 对象

#### 2.1 属性

```js
location.href;
location.protocol;
location.host;
location.hostname;
location.port;
location.pathname;
location.search;
location.hash;
location.origin;
```

- `href` 是完整 URL，其余属性是它的分解结果，修改其中一项会触发导航（`hash` 除外）。
- `search` 与 `hash` 都带前导符号，解析参数时需要 `URLSearchParams` 处理编码。
- `origin` 是只读属性，由协议、主机与端口组成。

#### 2.2 导航方法

```js
location.assign("/next");
location.href = "/next";
location.replace("/next");
location.reload();

location.hash = "#section";
```

- `assign` 与直接给 `href` 赋值等价，都会新增一条历史记录。
- `replace` 替换当前历史条目，用户后退不会回到被替换的页面，适合登录后的跳转。
- `reload` 重新加载当前页面，参数可控制是否绕过缓存。
- 只修改 `hash` 不会重新加载文档，可用于页内锚点与简易路由。

### 3. navigator 对象

#### 3.1 能力相关属性

```js
navigator.onLine;
navigator.language;
navigator.languages;
navigator.hardwareConcurrency;
navigator.userAgent;
navigator.clipboard;
```

- `onLine` 只表示网络接口状态，不代表目标服务可达，不能替代请求失败处理。
- `clipboard`、`geolocation`、`serviceWorker` 等能力只在安全上下文（HTTPS 或 localhost）暴露。
- `navigator.plugins`、`navigator.mimeTypes` 等旧接口已被冻结，仅作为兼容性说明保留。
- 属性存在只说明接口可用，权限与用户授权仍需在调用时处理。

#### 3.2 注册处理程序

```js
navigator.registerProtocolHandler("web+blog", "/handle?url=%s", "Blog");
navigator.registerContentHandler("application/rss+xml", "/feed?url=%s", "RSS");
```

- 协议处理程序把自定义 scheme 交给站点处理，需要用户确认并且只允许在安全上下文注册。
- 内容处理程序声明站点能处理某类 MIME，实际支持度受浏览器限制。
- 两者都需要用户手势触发，注册失败会抛异常，应包裹在 `try/catch` 中。

### 4. screen 与 history

#### 4.1 screen

```js
screen.width;
screen.height;
screen.availWidth;
screen.availHeight;
screen.colorDepth;
```

- `width`/`height` 是屏幕整体尺寸，`availWidth`/`availHeight` 扣除任务栏、菜单栏等系统占用。
- 单位为 CSS 像素，与 `devicePixelRatio` 配合才能得到物理像素尺寸。
- 多显示器环境下只反映当前窗口所在屏幕，窗口移动后可能变化。

#### 4.2 history

```js
history.pushState({ page: 1 }, "", "/page/1");
history.replaceState({ page: 1 }, "", "/page/1");
history.length;

history.back();
history.forward();
history.go(-1);

window.addEventListener("popstate", (event) => {
  // event.state
});
```

- `pushState` 新增历史条目但不加载页面，也不触发 `popstate`；前进、后退与 `go` 才会触发。
- `replaceState` 修改当前条目，适合同步筛选条件而不堆积历史。
- `state` 通过结构化克隆保存，不能存放 DOM 节点与函数。
- SPA 路由以 History API 为基础，服务端需要配置回退到入口 HTML，否则刷新子路径会 404。

### 5. 能力检测

#### 5.1 检测目标能力

```js
function supportsFetch() {
  return typeof window.fetch === "function";
}

if ("geolocation" in navigator) {
  // ...
}

if (CSS.supports("display", "grid")) {
  // ...
}
```

- 检测具体 API 是否存在、是否可调用，而不是判断浏览器名称与版本。
- 属性存在不代表可用，例如 `clipboard` 存在但缺少权限时写入仍会失败，调用处必须兜底。
- 样式能力优先交给 `CSS.supports` 与 `@supports`，避免在脚本里维护特性矩阵。

#### 5.2 避免 UA 判断

```js
if (typeof ResizeObserver === "function") {
  // use ResizeObserver
} else {
  // fall back to resize event
}
```

- UA 字符串可以伪造，浏览器也在逐步冻结版本信息，基于版本号的分支会随时间失效。
- 同一内核的不同外壳、WebView、嵌入式浏览器共享片段，版本映射无法稳定区分。
- 需要差异处理时按「能力存在 → 尝试调用 → 捕获失败降级」的顺序编写，而不是按品牌分支。
- 统计用途可以采集 UA，但功能开关不应依赖它。

### 6. 用户代理检测与软硬件检测

#### 6.1 UA 字符串构成

```js
console.log(navigator.userAgent);
// Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36
```

- 历史原因导致所有浏览器都以 `Mozilla/5.0` 开头，后续各段由厂商自行约定。
- 平台段、引擎段与版本段的顺序没有统一标准，解析器只能针对已知格式做启发式匹配。
- 版本号被简化的趋势使 UA 无法反映真实内核版本，只适合粗略归类与统计。

#### 6.2 软硬件信息

```js
navigator.hardwareConcurrency; // 逻辑核心数
navigator.deviceMemory; // GB，近似值
navigator.maxTouchPoints;
window.devicePixelRatio;
```

- `hardwareConcurrency` 与 `deviceMemory` 经过取整或降噪处理，用于资源分级参考，不适合精确判断机型。
- `maxTouchPoints` 可辅助区分触屏设备，但不能替代输入方式的运行时判断。
- 设备指纹类采集涉及隐私与合规要求，使用前需要明确目的与授权。
