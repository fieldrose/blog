---
author: Mimas
pubDatetime: 2026-11-18T00:00:00Z
modDatetime: 2026-11-18T00:00:00Z
title: "函数"
slug: js函数
featured: false
draft: false
tags:
  - JavaScript
series: JavaScript
seriesOrder: 4
description: "围绕函数的声明形式、参数机制与 this 绑定展开：函数声明与表达式的提升差异、箭头函数缺失的自身绑定、arguments 与默认参数和 rest 的取舍、四种调用方式下 this 的指向、函数自有属性与 new.target，以及递归的栈深度问题、尾调用优化在引擎中的落空和闭包、IIFE 的适用场景。"
---

## Table of contents

## 函数

本篇整理函数的定义方式、参数处理、`this` 绑定、自有属性、递归与闭包。函数在 JavaScript 中是一等对象，可以赋值、传参和返回，这一特性决定了闭包、回调和高阶函数的基本形态；`this` 的取值由调用方式决定，是多数运行时问题的来源。

### 1. 声明与调用

函数有三种常见写法：函数声明、函数表达式和箭头函数。三者在外观上接近，在提升、`this`、`arguments` 和构造能力上差异明显。

#### 1.1 函数声明与函数表达式

函数声明以 `function` 关键字开头，整体被提升，可以在声明语句之前调用。函数表达式把匿名或具名函数赋值给变量，遵循变量声明的提升规则：`var` 只提升变量名，赋值前调用会抛 `TypeError`；`let` 和 `const` 存在暂时性死区。

```js
sayHi(); // 可以调用
function sayHi() {
  return "hi";
}

// sayBye(); // TypeError: sayBye is not a function
var sayBye = function () {
  return "bye";
};
```

#### 1.2 箭头函数与函数名

箭头函数省略 `function` 关键字，单表达式可省略 `return`，返回对象字面量需要用括号包裹。箭头函数没有自身的 `this`、`arguments`、`super` 和 `new.target`，不能作为构造函数，也无法通过 `call`、`apply`、`bind` 改变 `this`，因此不适合作为对象方法或需要动态 `this` 的回调。每个函数都有 `name` 属性，具名函数取函数名，匿名函数由赋值目标推断，用于调试时的调用栈显示。

```js
const add = (a, b) => a + b;
const toObject = (value) => ({ value });
function outer() {
  // ...
}
outer.name; // "outer"

const named = function inner() {};
named.name; // "inner"
```

### 2. 参数机制

ECMAScript 的函数不校验参数个数，少传的参数为 `undefined`，多传的参数可通过 `arguments` 或 rest 参数访问。理解实参与形参的对应关系，是排查默认值和 `arguments` 联动问题的前提。

#### 2.1 arguments

`arguments` 是函数内部可用的类数组对象，包含全部实参，具有 `length` 和索引，但不是真正的数组，缺少 `map`、`filter` 等方法。非严格模式下它与形参保持联动，修改一方会影响另一方；严格模式下联动被取消。箭头函数没有 `arguments`，需要访问时使用 rest 参数。`arguments` 会阻碍部分引擎优化，新代码优先使用 rest。

```js
function sum() {
  return Array.from(arguments).reduce((acc, v) => acc + v, 0);
}
sum(1, 2, 3); // 6

function noLink(a) {
  "use strict";
  arguments[0] = 2;
  return a; // 1，严格模式下不联动
}
```

#### 2.2 默认参数

默认参数在形参为 `undefined` 时生效，`null` 不会触发默认值。默认值可以是表达式或函数调用，在每次调用时求值，而非定义时求值，因此可以引用前面的参数，但不能引用后面的参数。存在默认参数后，`arguments` 不再与形参联动，函数的 `length` 只统计默认参数之前的形参个数。

```js
function greet(name = "Mimas", greeting = `Hi, ${name}`) {
  return greeting;
}

greet(); // "Hi, Mimas"
greet("Other"); // "Hi, Other"
greet(null); // 使用 null，不触发默认值
```

#### 2.3 扩展与收集

rest 参数用 `...` 收集剩余实参，必须位于参数列表末尾，得到的是真正的数组。展开运算符用于调用或构造时拆开可迭代对象，二者语法相同但方向相反。展开大量元素时注意调用栈限制，超长数组应改用 `apply` 或分批处理。

```js
function log(first, ...rest) {
  return [first, rest];
}
log(...[1, 2, 3]); // [1, [2, 3]]
log(1, 2, 3); // [1, [2, 3]]
```

#### 2.4 按值传递

所有参数都按值传递，对象传递的是引用的副本：函数内修改成员对外可见，重新赋值形参不影响外部。这一行为在「变量与内存」一篇中已通过示例说明，此处用最小示例复核。

```js
function setName(obj) {
  obj.name = "Mimas";
  obj = { name: "Other" };
}

const person = {};
setName(person);
person.name; // "Mimas"
```

### 3. this 与调用方式

`this` 在函数被调用时确定，取值取决于调用形式，而不是定义位置（箭头函数除外）。同一函数用不同方式调用，`this` 可能指向全局对象、调用者对象、新实例或 `undefined`。

#### 3.1 普通调用与方法调用

普通调用即直接以函数名调用，非严格模式下 `this` 为全局对象，严格模式下为 `undefined`。方法调用中 `this` 为点号前的对象，方法被提取为独立变量后再调用，绑定随之丢失，这是回调中 `this` 为 `undefined` 的常见原因。

```js
"use strict";

function who() {
  return this;
}

who(); // undefined

const user = {
  name: "Mimas",
  getName() {
    return this.name;
  },
};

user.getName(); // "Mimas"
const fn = user.getName;
// fn(); // TypeError，this 为 undefined
```

#### 3.2 构造调用

使用 `new` 调用函数时，引擎创建新对象、把对象的原型指向函数的 `prototype`、以新对象作为 `this` 执行函数体，最后返回该对象。若构造函数显式返回一个对象，则返回该对象；返回原始值会被忽略。构造函数命名通常首字母大写，但命名不改变行为。

```js
function Person(name) {
  this.name = name;
}
const person = new Person("Mimas");
person.name; // "Mimas"
person instanceof Person; // true
```

#### 3.3 call、apply 与 bind

`call` 和 `apply` 立即调用函数并显式指定 `this`，区别仅在参数形式：`call` 逐个传参，`apply` 接收数组或类数组。`bind` 返回一个新函数，永久绑定 `this` 和部分参数，绑定后的函数仍可作为构造函数使用，此时绑定的 `this` 被忽略。三者对箭头函数无效。

```js
function introduce(greeting, punctuation) {
  return `${greeting}, ${this.name}${punctuation}`;
}

const user = { name: "Mimas" };
introduce.call(user, "Hi", "!"); // "Hi, Mimas!"
introduce.apply(user, ["Hi", "!"]); // "Hi, Mimas!"

const bound = introduce.bind(user, "Hi");
bound("!"); // "Hi, Mimas!"
```

#### 3.4 箭头函数的 this

箭头函数没有自身的 `this`，在定义时按词法作用域捕获外层 `this`，此后不再改变。这一特性适合在回调中保留外层上下文，例如定时器、事件处理和 Promise 链。反过来，把箭头函数直接写成对象方法，`this` 会指向对象外层的 `this`，通常不是期望结果。

```js
const counter = {
  count: 0,
  start() {
    setTimeout(() => {
      this.count++; // 继承 start 的 this，即 counter
    }, 0);
  },
};

counter.start();
```

### 4. 函数属性与方法

函数作为对象，拥有 `length`、`name` 等自有属性，内部还提供 `new.target` 用于判断调用方式。`caller` 和 `arguments` 这两个旧属性在严格模式下访问会抛 `TypeError`，已不应用于新代码。

#### 4.1 length 与 name

`length` 表示函数期望的形参个数，统计到第一个默认参数或 rest 参数之前为止，因此带默认值的函数其 `length` 往往小于形参总数。`name` 只读，由定义方式推断；`bind` 生成的函数名带 `bound` 前缀。

```js
function f(a, b = 1, ...rest) {
  // ...
}
f.length; // 1
f.name; // "f"

const g = f.bind(null);
g.name; // "bound f"
```

#### 4.2 new.target

`new.target` 在函数或类被 `new` 调用时指向被调用的构造器，普通调用时为 `undefined`。利用它可以强制构造函数只能通过 `new` 使用，也可以在继承场景中判断实际被实例化的子类。

```js
function Person(name) {
  if (!new.target) {
    throw new Error("Person must be called with new");
  }
  this.name = name;
}

new Person("Mimas"); // 正常
// Person("Mimas"); // Error
```

### 5. 递归与尾调用优化

递归用函数自身解决可分解为同类子问题的场景，例如树遍历、分治和数学定义。每次调用都会压入新的栈帧，深度超过引擎限制时抛出 `RangeError: Maximum call stack size exceeded`。

```js
function factorial(n) {
  return n <= 1 ? 1 : n * factorial(n - 1);
}

factorial(5); // 120
```

尾调用指函数的最后一步操作是调用另一个函数。ES6 规范要求严格模式下实现尾调用优化，复用当前栈帧，使递归的空间复杂度降为 O(1)。主流引擎（V8、SpiderMonkey）出于调试与性能权衡并未落地该优化，深递归仍需改写为循环或使用 trampoline。工程上优先选择迭代，必要时通过显式栈模拟递归过程。

```js
function factorialLoop(n) {
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

factorialLoop(5); // 120
```

### 6. 闭包与 IIFE

闭包是函数与其词法环境的组合：函数在定义时捕获外层作用域，即使外层函数已经返回，仍可读写其中的变量。闭包是模块封装、私有状态和回调的基础，同时也会延长被捕获变量的生命周期。

#### 6.1 闭包的定义

内层函数引用外层函数的局部变量，外层函数返回内层函数后，这些变量仍保存在内存中，只能通过返回的函数访问。多个闭包共享同一个外层环境时，读写的是同一份状态。

```js
function createCounter() {
  let count = 0;
  return {
    inc: () => ++count,
    value: () => count,
  };
}
const counter = createCounter();
counter.inc(); // 1
counter.value(); // 1
```

#### 6.2 闭包中的 this

普通函数的 `this` 在调用时确定，闭包本身不捕获调用者的 `this`。在内层函数中直接使用 `this` 会按内层函数的调用方式取值，通常是 `undefined` 或全局对象。需要在闭包中保留外层 `this` 时，使用箭头函数，或在进入闭包前把 `this` 保存到局部变量。

```js
const timer = {
  seconds: 0,
  start() {
    const self = this;
    setInterval(function () {
      self.seconds++; // 通过 self 保留外层 this
    }, 1000);
  },
};
```

#### 6.3 内存影响

闭包持有的变量不会被回收，直到闭包本身不可达。若闭包长期存活并引用大数组、DOM 节点或缓存对象，会形成事实上的内存泄漏。处理方式包括：只捕获必要的最小数据、在组件销毁时解除引用、避免在闭包中持有整棵 DOM 子树。

```js
function attach(node) {
  const largeData = new Array(1e6).fill(0);
  return () => node.textContent = largeData.length;
  // largeData 随闭包长期存活
}
```

#### 6.4 IIFE

立即调用函数表达式（IIFE）在定义后立即执行，函数体内部形成独立作用域，常用于隔离变量、避免污染全局。写法上需要用括号把函数表达式包裹起来，否则会被解析为函数声明；箭头函数同样适用。ES 模块和块级作用域普及后，IIFE 的使用场景减少，但在需要立即执行的初始化逻辑和旧式模块封装中仍然常见。

```js
(function () {
  var privateVar = 1;
  // ...
})();
(() => {
  const scoped = 2;
  // ...
})();
```
