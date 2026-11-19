---
author: Mimas
pubDatetime: 2026-11-18T00:00:00Z
modDatetime: 2026-11-18T00:00:00Z
title: "表单动画与Canvas"
slug: 表单动画与canvas
featured: false
draft: false
tags:
  - JavaScript
series: JavaScript
seriesOrder: 12
description: "梳理 requestAnimationFrame 相对定时器动画的时序对齐与后台暂停行为，Canvas 2D 的上下文获取、路径绘制、文本与变换，图像、渐变、阴影、像素数据与合成裁剪的进阶接口，WebGL 的渲染管线定位，以及表单提交、文本框选区、约束验证、序列化与富文本编辑的能力边界。"
---

## Table of contents

## 表单动画与Canvas

本篇覆盖脚本驱动动画的帧调度、Canvas 2D 的绘制与像素操作、WebGL 的职责边界，以及表单提交、文本框、约束验证与富文本编辑的接口。动画与表单是浏览器中两类典型的高频交互场景，前者关注帧预算，后者关注状态与校验的归属。

### 1. requestAnimationFrame

`requestAnimationFrame` 把回调排入下一次重绘之前执行，回调参数为高精度时间戳。与 `setInterval` 相比，它跟随显示器刷新率，标签页隐藏时自动暂停，同一帧内的多次请求合并执行，不会因为定时器漂移造成丢帧或堆积。

```js
let frameId = 0;

function step(timestamp) {
  // timestamp is a high resolution time in milliseconds
  const progress = (timestamp - startTime) / duration;
  if (progress < 1) {
    frameId = requestAnimationFrame(step);
  }
}

frameId = requestAnimationFrame(step);
// cancelAnimationFrame(frameId); // stop the pending frame
```

时间戳与 `performance.now()` 同一时间基准，首帧与后续帧的间隔并不恒定，位移计算必须基于实际时间差而不是固定步长，否则在高刷屏与低帧率设备上速度不一致。

```js
let last = 0;

function step(timestamp) {
  const delta = last ? timestamp - last : 0;
  last = timestamp;
  position += speed * (delta / 1000); // frame-rate independent
  requestAnimationFrame(step);
}
```

在不可见标签页中回调停止调度，恢复可见后时间戳继续推进，`delta` 可能出现大跨度值，需要设上限或改用固定步长累积。递归调用必须在回调内部重新请求，`cancelAnimationFrame` 只取消尚未执行的那一次。

### 2. Canvas 基础

Canvas 是一块位图画布，尺寸由 HTML 的 `width` 与 `height` 属性决定，与 CSS 尺寸相互独立。修改属性尺寸会清空内容并重置上下文状态，高分屏需要通过 `devicePixelRatio` 放大位图再用 CSS 缩小显示。

```html
<canvas id="stage" width="600" height="400"></canvas>
```

```js
const canvas = document.querySelector("#stage");
const ctx = canvas.getContext("2d");

if (ctx) {
  ctx.fillStyle = "#2563eb";
  ctx.fillRect(10, 10, 120, 60);
}
```

`getContext` 返回 `null` 表示上下文类型不被支持，后续调用会直接抛错，需要提前判断。

路径由 `beginPath` 开启、`moveTo` 与 `lineTo` 描述、`closePath` 闭合，`fill` 与 `stroke` 负责填充和描边。`save` 与 `restore` 保存和恢复变换、样式与裁剪区域，是嵌套绘制的标准做法。

```js
ctx.beginPath();
ctx.arc(200, 100, 40, 0, Math.PI * 2);
ctx.fillStyle = "#f59e0b";
ctx.fill();

ctx.save();
ctx.translate(300, 200);
ctx.rotate(Math.PI / 6);
ctx.fillText("label", 0, 0);
ctx.restore();
```

文本绘制依赖 `font`、`textAlign`、`textBaseline`，`measureText` 返回宽度等度量信息。`clearRect` 只清除像素，不重置状态；需要整帧重绘时应先清除再绘制。

### 3. 2D 进阶

图像绘制使用 `drawImage`，三参数形式按原始尺寸绘制，五参数形式指定宽高，九参数形式从源图像裁剪一块区域。跨域图片未声明 CORS 时会污染画布，此后调用 `getImageData` 抛出 `SecurityError`。

```js
const image = new Image();
image.crossOrigin = "anonymous";
image.src = "/cover.png";
image.onload = () => {
  ctx.drawImage(image, 0, 0, 200, 120);
  // ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
};
```

渐变由 `createLinearGradient` 或 `createRadialGradient` 生成，配合 `addColorStop` 声明色标；`createPattern` 用图像或画布平铺。阴影通过 `shadowColor`、`shadowBlur`、`shadowOffsetX`、`shadowOffsetY` 控制，开销随模糊半径上升。

```js
const gradient = ctx.createLinearGradient(0, 0, 0, 120);
gradient.addColorStop(0, "#ffffff");
gradient.addColorStop(1, "#1e293b");
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 240, 120);
```

像素操作基于 `ImageData`，`data` 是 `Uint8ClampedArray`，按 RGBA 顺序排列，超出 0 到 255 的值会被截断。整幅读写代价较高，应避免在逐帧循环中频繁调用。

```js
const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
for (let i = 0; i < pixels.data.length; i += 4) {
  pixels.data[i + 3] = 128; // alpha channel
}
ctx.putImageData(pixels, 0, 0);
```

`globalCompositeOperation` 决定新绘制内容与已有像素的混合方式，`clip` 把当前路径设为裁剪区域，二者都需要配合 `save` 与 `restore` 限制作用范围。

```js
ctx.save();
ctx.beginPath();
ctx.rect(0, 0, 200, 200);
ctx.clip();
ctx.drawImage(image, 0, 0, 600, 600);
ctx.restore();
```

### 4. WebGL 概览

WebGL 提供基于 OpenGL ES 的 3D 渲染接口，通过 `getContext("webgl")` 或 `getContext("webgl2")` 获取上下文。与 2D 上下文的即时绘制不同，WebGL 采用状态机与显式资源管理，着色器、缓冲区与纹理都需要手工创建和绑定。

```js
const gl = canvas.getContext("webgl2");
if (gl) {
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
}
```

渲染流程为顶点着色器处理顶点、图元装配、光栅化、片元着色器输出颜色，顶点与片元着色器以字符串形式编译链接为 program。这套接口的样板代码量大，实际项目通常通过 Three.js、Babylon.js 等库封装，或使用 WebGPU 承担更高吞吐的场景。

### 5. 表单基础与文本框

表单提交触发 `submit` 事件，默认行为是向 `action` 发起请求。调用 `form.submit()` 不会触发 `submit` 事件，绕过校验与监听器；需要走完整流程时使用 `requestSubmit()`。重置触发 `reset` 事件，`form.reset()` 同样不触发。

```js
form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  save(new FormData(form));
});
```

文本框的选区通过 `selectionStart`、`selectionEnd`、`selectionDirection` 读写，`setSelectionRange` 可设置选区并把焦点移入。读取选区前应先 `focus`，否则部分浏览器返回旧值。

```js
input.focus();
input.setSelectionRange(0, input.value.length); // select all
// input.select() is the shorthand for the same range
```

输入过滤在 `input` 事件中改写 `value` 会移动光标，通常先记录 `selectionStart` 再恢复。`beforeinput` 携带 `inputType` 并可在默认行为执行前取消，但组合输入期间的 `insertCompositionText` 不可取消，过滤逻辑需结合 `compositionstart`、`compositionend` 判断。

```js
input.addEventListener("input", () => {
  const caret = input.selectionStart;
  input.value = input.value.replace(/\D/g, ""); // digits only
  input.setSelectionRange(caret, caret);
});
```

约束验证 API 以属性声明规则，脚本负责读取结果：

| 成员 | 作用 |
| --- | --- |
| `required`、`pattern`、`min`、`max`、`maxlength` | 声明式约束 |
| `willValidate` | 是否参与校验 |
| `validity` | `ValidityState`，逐项布尔标记 |
| `validationMessage` | 浏览器生成的提示文本 |
| `checkValidity()` | 校验并触发 `invalid` 事件 |
| `reportValidity()` | 校验并显示原生提示 |
| `setCustomValidity()` | 注入自定义错误，空字符串清除 |

```js
email.addEventListener("input", () => {
  email.setCustomValidity("");
  if (!email.validity.valid) {
    email.setCustomValidity("邮箱格式无效");
  }
});
```

`setCustomValidity` 一旦设置非空值，元素会持续处于无效状态，必须在条件恢复时显式清空。`novalidate` 属性关闭原生校验，适合完全自绘提示的界面。

### 6. 选择框、序列化与富文本

选择框的 `value` 取选中项的值，多选时只返回第一个；`selectedOptions` 是实时的 `HTMLCollection`，遍历全部选中项应使用它。`options` 包含所有 `option`，`selectedIndex` 为 `-1` 表示无选中。

```js
const select = document.querySelector("select");
select.multiple; // boolean
Array.from(select.selectedOptions, (option) => option.value);
select.selectedIndex = -1; // clear selection
```

表单序列化使用 `FormData` 或 `URLSearchParams`，前者保留文件与重复键，后者输出可直接拼接到查询串的编码结果。没有 `name` 的控件、禁用的控件与未选中的复选框不会进入序列化结果。

```js
const data = new FormData(form);
data.append("tag", "js"); // repeated keys are kept
const query = new URLSearchParams(data).toString();
```

富文本编辑基于 `contenteditable` 属性，元素内容可直接编辑，浏览器负责生成 DOM 与光标行为。

```html
<div contenteditable="true" role="textbox" aria-multiline="true">
  editable content
</div>
```

编辑区域的选区由 `window.getSelection()` 返回的 `Selection` 对象维护，`rangeCount`、`getRangeAt`、`addRange` 用于读写。基于 `document.execCommand` 的命令式编辑接口已废弃，新的输入行为统一走 `beforeinput` 与 `input`；需要结构化文档时，编辑器通常自行维护数据模型，只把 DOM 当作渲染结果。
