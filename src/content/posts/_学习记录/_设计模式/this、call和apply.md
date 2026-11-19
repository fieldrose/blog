---
author: Mimas
pubDatetime: 2026-11-18T00:00:00Z
modDatetime: 2026-11-18T00:00:00Z
title: "this、call 和 apply"
slug: this、call和apply
featured: false
draft: false
tags:
  - 设计模式
series: 设计模式
seriesOrder: 2
description: "按调用方式拆解 this 的四种绑定与箭头函数的词法覆盖，梳理 call/apply 的差异与借用类数组方法的场景，并给出 call、apply、bind 的手写实现及其在严格模式、new 调用下的边界差异。"
---

## Table of contents

## this、call 和 apply

`this` 是函数被调用时确定的隐式参数，与声明位置无关（箭头函数除外）。设计模式中大量依赖 `this` 完成状态访问与委托，理解绑定规则是读懂策略对象、代理对象与单例实现的前提。`call` 与 `apply` 是手动指定绑定的入口，`bind` 在其上套了一层固定化。

### 1. this 的指向

#### 1.1 作为对象方法调用

```js
const user = {
  name: "Mimas",
  getName() {
    return this.name;
  },
};

user.getName(); // "Mimas"
```

- `this` 指向调用表达式中点号左侧的对象，即 `user`。
- 判定依据是调用时的形态，而不是函数被定义在哪个对象里。
- 把方法引用赋给变量后绑定丢失：

```js
const getName = user.getName;
getName(); // undefined (strict mode) or window.name (sloppy mode)
```

#### 1.2 作为普通函数调用

```js
function currentName() {
  return this.name;
}

currentName(); // undefined in strict mode
```

- 非严格模式下 `this` 指向全局对象，严格模式下为 `undefined`。
- ES 模块顶层与 `class` 方法体内默认严格模式，脚本文件则取决于是否写了 `"use strict"`。
- 依赖全局对象做隐式状态传递的写法在模块化后普遍失效，`this.name` 会直接抛错。

#### 1.3 构造器调用

```js
function Person(name) {
  this.name = name;
}

const person = new Person("Mimas");
person.name; // "Mimas"
```

`new` 的执行分为四步：

1. 创建一个空对象，并把它的原型设为构造函数的 `prototype`。
2. 以该对象为 `this` 执行构造函数。
3. 若构造函数没有返回对象，则返回步骤 1 创建的对象；返回原始值则忽略。
4. 若显式返回对象，则用返回的对象替代。

```js
function SafePerson(name) {
  if (!new.target) {
    return new SafePerson(name);
  }
  this.name = name;
}
```

- 忘记 `new` 时 `this` 指向全局对象或 `undefined`，`new.target` 可以检测到这种误用。
- 返回对象会覆盖 `this`，这是工厂函数与构造器混用时最容易忽略的一处。

#### 1.4 call/apply 显式绑定

```js
function greet(greeting) {
  return `${greeting}, ${this.name}`;
}

greet.call({ name: "Mimas" }, "hi"); // "hi, Mimas"
greet.apply({ name: "Mimas" }, ["hi"]); // "hi, Mimas"
```

- 第一个参数成为 `this`，后续参数按 `call` 逐个传、按 `apply` 以数组传。
- 显式绑定优先级高于方法调用形态，`obj.method.call(other)` 中 `this` 是 `other`；`Reflect.apply(fn, thisArg, args)` 是函数式写法，不会受 `fn.apply` 被改写的影响。

#### 1.5 箭头函数的词法 this

```js
const timer = {
  seconds: 0,
  start() {
    setInterval(() => {
      this.seconds += 1;
    }, 1000);
  },
};
```

- 箭头函数没有自己的 `this`、`arguments`、`new.target`、`prototype`，`this` 取定义时外层作用域的值。
- `call`、`apply`、`bind` 无法改变箭头函数的 `this`，传入的绑定参数会被忽略。
- 箭头函数不能作为构造器，`new (() => {})` 抛 `TypeError`。

#### 1.6 丢失 this 的典型场景与 bind

```js
const button = {
  label: "submit",
  handleClick() {
    console.log(this.label);
  },
};

// Broken: callback receives a detached function
element.addEventListener("click", button.handleClick);

// Fixed: bind the receiver
element.addEventListener("click", button.handleClick.bind(button));

// Fixed: wrap at the call site
element.addEventListener("click", () => button.handleClick());
```

- 事件监听、`setTimeout`、数组方法传入方法引用、回调参数解构，都会丢失接收者。
- `bind` 返回一个 `this` 已固定的新函数，后续 `call` 与 `apply` 无法覆盖；同时可预置部分参数，形成偏函数。
- 只需要单次调用时，箭头函数或调用点包装更直接，`bind` 适合把函数作为值反复传递；React 类组件时代的 `this.handleChange = this.handleChange.bind(this)` 已由函数组件与箭头类字段取代。

### 2. call 和 apply 的差异与借用

#### 2.1 两者差异

| 方法 | 参数形式 | 典型场景 |
| --- | --- | --- |
| `call` | 参数逐个传入 | 参数个数固定 |
| `apply` | 第二个参数为数组或类数组 | 参数已在数组中 |
| `Reflect.apply` | 同 `apply` | 避免依赖函数自身的 `apply` |

```js
Math.max.call(null, 3, 1, 5); // 5
Math.max.apply(null, [3, 1, 5]); // 5
Math.max(...[3, 1, 5]); // 5
```

- 展开运算符普及后，`Math.max.apply(null, arr)` 这类写法大多被 `Math.max(...arr)` 取代；`apply` 仍用于无法预知参数个数的通用工具，例如把数组整体转发给另一个函数。

#### 2.2 借用方法的用途

```js
const arrayLike = { 0: "a", 1: "b", length: 2 };

Array.prototype.slice.call(arrayLike); // ["a", "b"]
Array.from(arrayLike); // ["a", "b"]
```

- 类数组（`arguments`、`NodeList`、DOM 集合）通过 `call` 借用数组方法，要求对象具备 `length` 与数字索引。
- `Array.from` 与展开运算符是当下的标准替代；`slice` 借用在旧代码里仍常见。
- 类型判定借用 `Object.prototype.toString`，避免 `instanceof` 的跨 realm 失效：

```js
Object.prototype.toString.call([]); // "[object Array]"
Object.prototype.toString.call(null); // "[object Null]"
```

- 借用成立的前提是方法内部只依赖被访问的属性，不依赖接收者是数组实例本身。
- `Array.prototype.push.call(obj, 1)` 会成功修改类数组，但拿不到 `length` 的自动维护，结果可能不符合预期。

#### 2.3 借用带来的约束

- 借用丢弃了接收者的类型保证，参数不合法时错误信息来自原生实现，定位成本高。
- 对 `document.querySelectorAll` 返回的集合借用 `map` 会失败，因为集合没有 `map`，需要先转换。
- 现代代码优先使用 `Array.from`、展开与 `Object.entries`，只在处理旧接口或实现通用工具时借用。

### 3. 手写实现

手写 `call`、`apply`、`bind` 的目的是理解绑定机制，生产代码仍应使用原生方法。

#### 3.1 手写 call

```js
Function.prototype.myCall = function (context, ...args) {
  const ctx = context == null ? globalThis : Object(context);
  const key = Symbol("fn");
  ctx[key] = this;

  try {
    return ctx[key](...args);
  } finally {
    delete ctx[key];
  }
};

function describe() {
  return this.name;
}

describe.myCall({ name: "Mimas" }); // "Mimas"
```

- 核心思路是「把函数临时挂到目标对象上」，让 `ctx[key]()` 构成方法调用，从而让 `this` 指向 `ctx`。
- 用 `Symbol` 作键避免覆盖目标对象已有属性，`finally` 保证异常时也能清理；临时属性会在调用期间出现在对象上，目标对象被 `Object.freeze` 时赋值会失败。

#### 3.2 手写 apply

```js
Function.prototype.myApply = function (context, args = []) {
  const ctx = context == null ? globalThis : Object(context);
  const key = Symbol("fn");
  ctx[key] = this;

  try {
    return ctx[key](...args);
  } finally {
    delete ctx[key];
  }
};

function sum(a, b) {
  return a + b;
}

sum.myApply(null, [1, 2]); // 3
```

- 与 `myCall` 的唯一差别是参数以数组传入，实现上直接展开；未传第二个参数时按空数组处理，与原生 `apply` 对 `null`、`undefined` 的处理一致。

#### 3.3 手写 bind

```js
Function.prototype.myBind = function (context, ...boundArgs) {
  const target = this;

  function bound(...callArgs) {
    const isNew = this instanceof bound;
    return target.apply(isNew ? this : context, [...boundArgs, ...callArgs]);
  }

  if (target.prototype) {
    bound.prototype = Object.create(target.prototype);
  }

  return bound;
};

const greet = function (greeting, name) {
  return `${greeting}, ${this.title} ${name}`;
};

const hello = greet.myBind({ title: "Dr." }, "hi");
hello("Mimas"); // "hi, Dr. Mimas"
```

- `bind` 返回的函数可以被 `new` 调用，此时绑定的 `this` 被忽略，新创建的对象作为 `this`。
- 原型链需要接上，保证 `new bound() instanceof target` 成立，这通过 `Object.create(target.prototype)` 完成；原生 `bind` 还处理了 `name`、`length` 与 `Symbol.hasInstance`，简化实现不覆盖这些细节。

### 4. 边界情况与工程取舍

#### 4.1 严格模式与原始值装箱

```js
function whoAmI() {
  "use strict";
  return this;
}

whoAmI.call(null); // null
whoAmI.call(1); // 1
```

| 场景 | 非严格模式 | 严格模式 |
| --- | --- | --- |
| `fn.call(null)` | `globalThis` | `null` |
| `fn.call(1)` | `Number` 包装对象 | 原始值 `1` |
| `fn()` | `globalThis` | `undefined` |

- 严格模式保留传入的原始值，非严格模式会装箱，这是两种模式行为差异最大的一处。
- 简化版 `myCall` 用 `context == null ? globalThis` 是为了演示方法借用机制，与严格模式语义不一致。

#### 4.2 箭头函数与 class

```js
const obj = {
  value: 1,
  read: () => this.value,
};

obj.read.call({ value: 2 }); // undefined, `this` stays lexical
```

- 箭头函数的 `this` 在定义时确定，之后无法被任何手段改写。
- `class` 的构造器不能直接 `call` 或 `apply`，必须用 `new`；派生类构造器中 `super()` 之前访问 `this` 会抛错。`class` 方法默认严格模式，`this` 丢失时得到 `undefined` 而不是全局对象。

#### 4.3 何时用 bind，何时用箭头函数

| 需求 | 推荐写法 |
| --- | --- |
| 回调中访问外层 `this` | 箭头函数 |
| 把方法作为值传给第三方 API | `bind` |
| 预置部分参数 | `bind` 或直接返回闭包 |
| 需要运行时动态切换接收者 | `call` / `apply` |

- `bind` 生成的是函数值，适合需要长期持有的回调；需要同时固定 `this` 与部分参数时，闭包的可读性通常优于 `bind` 的偏函数形式。
- 工具函数内部使用 `apply` 转发参数时，优先 `Reflect.apply`，避免 `fn.apply` 被业务代码覆盖。
