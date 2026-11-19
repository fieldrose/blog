---
author: Mimas
pubDatetime: 2026-11-18T00:00:00Z
modDatetime: 2026-11-18T00:00:00Z
title: "WebAPI"
slug: webapi
featured: false
draft: false
tags:
  - JavaScript
series: JavaScript
seriesOrder: 13
description: "梳理 ArrayBuffer、TypedArray 与 SharedArrayBuffer 的内存模型及 Atomics 的同步约束，postMessage 与 Encoding API 的跨上下文协作，File、Blob、FileReader 与媒体元素，原生拖放、Notifications 与 Page Visibility，ReadableStream 的背压机制，High Resolution Time 与 Performance Timeline，以及模板、影子 DOM、自定义元素与 Web Cryptography 的能力边界。"
---

## Table of contents

## WebAPI

本篇覆盖浏览器提供的二进制与并发原语、跨上下文通信、文件与媒体、拖放与通知、流式数据处理、性能度量，以及 Web 组件与加密接口。这些 API 的共同前提是安全上下文：除少数例外，均要求页面运行在 HTTPS 或 `localhost`。

### 1. 二进制数据与并发

`ArrayBuffer` 是一段定长字节缓冲区，本身不可直接读写，需要通过视图访问。`TypedArray` 按固定元素类型解释字节，`DataView` 提供带字节序参数的自由读写，适合解析网络协议。

```js
const buffer = new ArrayBuffer(8);
const ints = new Int32Array(buffer); // two 32-bit slots
const view = new DataView(buffer);
view.setUint16(0, 0x1234, true); // little-endian
view.getUint8(0); // 0x34
```

`TypedArray` 的 `buffer`、`byteOffset`、`byteLength` 描述其底层视图范围，多个视图可共享同一缓冲区。`slice` 复制数据，`subarray` 共享内存，二者行为差异直接影响后续写入的影响范围。

```js
const all = new Uint8Array(buffer);
const part = all.subarray(0, 4); // shares memory
part[0] = 1; // all[0] is also 1
```

`SharedArrayBuffer` 可在多个 agent（如 Worker）间共享同一块内存，避免 `postMessage` 的结构化克隆复制开销。启用它需要页面具备跨源隔离，即响应头同时包含 `Cross-Origin-Opener-Policy: same-origin` 与 `Cross-Origin-Embedder-Policy: require-corp`。

```js
const shared = new SharedArrayBuffer(16);
const counter = new Int32Array(shared);

Atomics.add(counter, 0, 1);
Atomics.load(counter, 0); // atomic read
Atomics.compareExchange(counter, 0, 1, 2); // CAS
```

普通读写在多线程下存在竞态，`Atomics` 提供原子操作与 `wait`、`notify` 组成的同步原语。`Atomics.wait` 会阻塞调用线程，只能在 Worker 中使用，主线程调用会抛出 `TypeError`。

普通对象跨上下文传递时走结构化克隆，函数与 DOM 节点不可克隆，传入会抛出 `DataCloneError`，原型链同样不会保留。`postMessage` 的 `transfer` 列表可把 `ArrayBuffer` 的所有权转移，转移后原上下文中的缓冲区长度变为 0。

```js
worker.postMessage(payload, [buffer]);
buffer.byteLength; // 0 after transfer
```

### 2. 跨上下文通信与编码

`postMessage` 是 `window`、`Worker`、`MessagePort` 与 `BroadcastChannel` 的通用通信入口，消息体走结构化克隆。接收端必须校验 `event.origin` 与 `event.source`，否则任意来源的页面都可能注入消息。

```js
iframe.contentWindow.postMessage({ type: "ready" }, "https://example.com");

window.addEventListener("message", (event) => {
  if (event.origin !== "https://example.com") return;
  if (event.data?.type !== "ready") return;
  // handle the message
});
```

`MessageChannel` 创建一对端口，适合在 `window` 与 Worker 之间建立专用通道；`BroadcastChannel` 按名称在同源上下文间广播，用于多标签页状态同步。

```js
const channel = new BroadcastChannel("session");
channel.postMessage({ type: "logout" });
channel.onmessage = (event) => {
  // receives broadcasts from other tabs
};
```

Encoding API 负责字符串与字节序列的转换。`TextEncoder` 只输出 UTF-8，`TextDecoder` 支持多种编码，`fatal: true` 时遇到非法序列抛错而非替换为 U+FFFD。

```js
const bytes = new TextEncoder().encode("中文");
const decoder = new TextDecoder("utf-8", { fatal: true });
decoder.decode(bytes); // "中文"
```

`{ stream: true }` 允许分块解码，跨块的多字节字符不会被截断成乱码，处理流式响应时必须启用。

### 3. 文件与媒体

`File` 继承自 `Blob`，额外带有 `name`、`lastModified` 与 `type`。文件输入与拖放都产出 `File` 对象，读取方式有两条：`FileReader` 的事件模型，以及 `Blob` 上的 `text()`、`arrayBuffer()`、`stream()` 返回 Promise。

```js
const file = input.files[0];
const text = await file.text();
const buffer = await file.slice(0, 1024).arrayBuffer();
```

`FileReader` 提供 `readAsText`、`readAsDataURL`、`readAsArrayBuffer`，通过 `load`、`error`、`progress` 事件反馈进度。需要上传进度时通常改用 `XMLHttpRequest` 的 `upload` 事件或 `fetch` 配合流。

```js
const reader = new FileReader();
reader.onload = () => {
  reader.result; // string or ArrayBuffer
};
reader.readAsText(file);
```

`URL.createObjectURL` 为 `Blob` 生成临时的 `blob:` 地址，可用于图片预览与音视频源。对象 URL 在文档生命周期内持续有效，必须显式 `revokeObjectURL` 释放。

```js
const url = URL.createObjectURL(blob);
image.src = url;
image.onload = () => URL.revokeObjectURL(url);
```

媒体元素的状态由 `readyState`、`networkState` 与 `error` 描述，`play()` 返回 Promise，自动播放策略拒绝时以 `NotAllowedError` 拒绝。`loadedmetadata` 后可读取 `duration` 与视频尺寸，`timeupdate` 频率不足以驱动逐帧绘制，动画应改用 `requestVideoFrameCallback`。

```js
video.addEventListener("loadedmetadata", () => {
  video.duration; // seconds
  video.videoWidth;
});
await video.play().catch(() => {
  // autoplay blocked
});
```

### 4. 拖放与通知

原生拖放需要同时处理源与目标。源元素设置 `draggable="true"`，在 `dragstart` 中通过 `dataTransfer.setData` 写入数据；目标必须在 `dragover` 中调用 `preventDefault`，否则 `drop` 不会触发。

```js
source.addEventListener("dragstart", (event) => {
  event.dataTransfer.setData("text/plain", source.dataset.id);
  event.dataTransfer.effectAllowed = "move";
});

zone.addEventListener("dragover", (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
});

zone.addEventListener("drop", (event) => {
  event.preventDefault();
  const id = event.dataTransfer.getData("text/plain");
  // handle drop
});
```

`dataTransfer.files` 承载拖入的文件，`items` 提供更细粒度的类型判断。`dragenter` 与 `dragleave` 在子元素间移动时会反复触发，计数或判断 `relatedTarget` 才能正确实现高亮。

Notifications API 先请求权限，再构造通知。`Notification.permission` 为 `granted`、`denied`、`default` 三态，`requestPermission` 必须由用户手势触发。

```js
if (Notification.permission === "default") {
  await Notification.requestPermission();
}
if (Notification.permission === "granted") {
  new Notification("构建完成", { body: "耗时 42s" });
}
```

持久化通知与后台推送依赖 Service Worker 的 `showNotification`，页面内的 `Notification` 在页面关闭后失效。

Page Visibility 通过 `document.visibilityState` 与 `visibilitychange` 事件反映页面是否可见，用于暂停轮询、动画与视频。`hidden` 不等于页面已卸载，切换标签页即可触发。

```js
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    pausePolling();
  } else {
    resumePolling();
  }
});
```

### 5. Streams API

`ReadableStream` 把数据建模为按需拉取的序列，消费端通过 `getReader()` 逐块读取。`fetch` 的 `response.body` 即为 `ReadableStream`，适合处理大文件与流式响应，避免一次性读入内存。

```js
const response = await fetch("/data.bin");
const reader = response.body.getReader();

let received = 0;
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  received += value.byteLength;
}
```

自定义流由 `start`、`pull`、`cancel` 三个回调构成，`controller.enqueue` 推入数据，`controller.close` 结束。`pull` 仅在内部队列未满时调用，形成背压，生产速率自动匹配消费速率。

```js
const stream = new ReadableStream({
  start(controller) {
    controller.enqueue(new TextEncoder().encode("chunk"));
    controller.close();
  },
  pull(controller) {
    // called only when the internal queue has room
  },
});
```

`pipeThrough` 串联转换流，`pipeTo` 把数据导入可写流。`TextDecoderStream` 可直接把字节流解码为字符串流，省去手工分块处理。

```js
const text = await new Response(
  response.body.pipeThrough(new TextDecoderStream()),
).text();
```

`ReadableStream` 支持异步迭代，`for await...of` 内部自动加锁并在迭代结束时释放。已被 `getReader()` 加锁的流再次加锁会抛出 `TypeError`。

### 6. 计时与性能

`performance.now()` 返回自 `performance.timeOrigin` 起的毫秒数，精度受跨源隔离影响，普通页面通常被量化到 100 微秒级。`Date.now()` 受系统时钟调整影响，不适合测量耗时。

```js
const start = performance.now();
// measured work
const cost = performance.now() - start;
```

User Timing 用 `mark` 与 `measure` 记录命名区间，`getEntriesByType` 读取结果。`measure` 可引用两个已有标记，也可直接传入起止时间。

```js
performance.mark("render-start");
// render
performance.mark("render-end");
performance.measure("render", "render-start", "render-end");

performance.getEntriesByName("render")[0].duration;
```

Performance Timeline 汇总 `navigation`、`resource`、`paint`、`longtask`、`element` 等条目。`PerformanceObserver` 以异步方式订阅新条目，`buffered: true` 可读取注册之前已经产生的记录。

```js
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    entry.entryType; // "resource", "longtask", ...
    entry.duration;
  }
});

observer.observe({ type: "longtask", buffered: true });
```

条目缓冲区有上限，`performance.setResourceTimingBufferSize` 可调整资源条目容量。跨域资源需要 `Timing-Allow-Origin` 响应头才会暴露详细耗时，否则关键字段为 0。

### 7. Web 组件与 Web Cryptography

Web 组件由三部分组成：`template` 提供惰性解析的标记片段，影子 DOM 隔离样式与查询作用域，自定义元素把行为挂到标签上。

```html
<template id="card">
  <style>
    :host { display: block; }
  </style>
  <slot></slot>
</template>
```

`attachShadow({ mode: "open" })` 返回影子根，`mode: "closed"` 时外部无法通过 `element.shadowRoot` 访问。`slot` 负责分发轻量 DOM，`:host` 与 `::slotted()` 在影子样式中选择宿主与分发内容。

```js
class UserCard extends HTMLElement {
  connectedCallback() {
    const shadow = this.attachShadow({ mode: "open" });
    shadow.innerHTML = "<slot></slot>";
  }
}

customElements.define("user-card", UserCard);
```

自定义元素的生命周期包括 `connectedCallback`、`disconnectedCallback`、`adoptedCallback` 与 `attributeChangedCallback`，后两者配合静态 `observedAttributes` 才能监听属性变化。标签名必须包含短横线，注册后不能重复定义。

Web Cryptography 通过 `crypto.subtle` 提供摘要、签名、密钥派生与加解密，全部方法返回 Promise，且只在安全上下文可用。

```js
const data = new TextEncoder().encode("message");
const digest = await crypto.subtle.digest("SHA-256", data);
new Uint8Array(digest).length; // 32

crypto.getRandomValues(new Uint8Array(16)); // CSPRNG
```

`crypto.subtle` 的密钥不可导出时以 `CryptoKey` 句柄存在，避免明文进入 JavaScript 堆；`exportKey` 仅在密钥标记为可导出时成功。`Math.random` 不具备密码学安全性，令牌与盐值必须使用 `crypto.getRandomValues`。
