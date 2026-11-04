---
author: Mimas
pubDatetime: 2024-07-20T14:05:00Z
title: "手写 new：一个操作符背后的原型链四步曲"
slug: js-new-operator-handwrite
featured: false
draft: false
tags:
  - JavaScript
  - 面试
description: "面试高频题：实现一个 new。从 Object.create 到 Reflect.construct，讲清原型指向、this 绑定与构造函数返回值的判定规则。"
---

"手写一个 `new`"是前端面试的常客。题目很小，但它能同时考到原型链、`this` 绑定和构造函数的返回值规则。这篇把实现、边界情况和标准 API 版本一次写透。

## Table of contents

## 一、`new` 到底做了什么

抛开语法糖，`new Foo(a, b)` 一共做四件事：

1. **创建一个空对象**；
2. 把这个对象的原型（`[[Prototype]]`）指向构造函数的 `prototype`；
3. 把构造函数的 `this` 绑定到新对象，并执行构造函数体；
4. 看构造函数的返回值：如果显式 `return` 了一个**对象或函数**，就用它；否则返回新对象。

第 4 步是最容易被漏掉的，也是面试区分度所在：

```js
function A() {
  this.x = 1;
}
console.log(new A()); // A { x: 1 }

function B() {
  this.x = 1;
  return { x: 2 }; // 显式返回对象，新对象被丢弃
}
console.log(new B()); // { x: 2 }

function C() {
  this.x = 1;
  return 42; // 返回原始值，被忽略
}
console.log(new C()); // C { x: 1 }
```

## 二、ES5 风格实现

```js
function myNew(constructor, ...args) {
  if (typeof constructor !== "function") {
    throw new TypeError("constructor is not a function");
  }

  // 1 + 2：创建对象并挂好原型链
  const obj = Object.create(constructor.prototype);

  // 3：绑定 this 并执行构造函数
  const result = constructor.apply(obj, args);

  // 4：对象/函数类型的返回值优先
  if (
    result !== null &&
    (typeof result === "object" || typeof result === "function")
  ) {
    return result;
  }

  return obj;
}
```

验证一下原型链和返回值规则都成立：

```js
function Person(name) {
  this.name = name;
}
Person.prototype.sayHi = function () {
  return `hi, ${this.name}`;
};

const p = myNew(Person, "Mimas");
console.log(p.name); // "Mimas"
console.log(p.sayHi()); // "hi, Mimas"
console.log(p instanceof Person); // true
```

`Object.create(Foo.prototype)` 是这里的关键：它一步完成"建空对象 + 设原型"。在没有 `Object.create` 的远古环境里，经典替代写法是用一个临时构造函数中转：

```js
function F() {}
F.prototype = constructor.prototype;
const obj = new F();
```

注意中转构造函数的原型指向 `constructor.prototype` 后，`obj.constructor` 会顺着原型链指回原构造函数，行为与 `Object.create` 版本一致。

## 三、为什么 `typeof null` 要特判

判定里的 `result !== null` 不是可有可无：`typeof null === "object"` 是 JavaScript 的历史遗留行为。如果不排除 `null`，构造函数显式 `return null` 时会错误地返回 `null`，而按照规范 `null` 属于"假对象"，应当被忽略、返回新创建的对象。

## 四、ES6 的标准答案：Reflect.construct

了解规范操作后，现代代码可以直接用 `Reflect.construct`，它内部完整实现了 `new` 的语义，包括对 class 的正确处理：

```js
function myNew(constructor, args) {
  return Reflect.construct(constructor, args);
}
```

这里有个值得一提的细节：ES6 的 **class 必须通过 `new` 调用**，直接 `Person()` 会抛 `TypeError`。`Reflect.construct` 走的是规范的 `[[Construct]]` 内部槽，天然遵守这条规则；而手写的 `apply` 版本对 class 会直接报错（class 没有 `[[Call]]`），反而和原生 `new` 的行为保持一致。

可以通过 `Function.prototype.toString` 做一道加分检查：

```js
const isClass = fn =>
  typeof fn === "function" &&
  /^class[\s{]/.test(Function.prototype.toString.call(fn));
```

## 五、一句话总结

`new` 的本质是"**按构造函数的原型造对象、在对象上跑构造函数、最后尊重对象类型的显式返回值**"。手写时只要把这四步一一对应成代码，并且记着 `null` 特判和 class 的调用限制，这道题就没有任何盲区了。
