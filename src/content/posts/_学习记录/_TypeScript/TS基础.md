---
author: Mimas
pubDatetime: 2026-11-09T00:00:00Z
modDatetime: 2026-11-09T00:00:00Z
title: "TS基础"
slug: ts基础
featured: false
draft: false
tags:
  - TypeScript
series: TypeScript
seriesOrder: 1
description: "ts基础笔记"
---

## Table of contents

## 前置基础

### 编译器

> 运行程序就是让运行时计算由编译器从源码解析得来的AST生成的字节码

<table>
  <tr>
    <th rowspan="3">TS (编译)</th>
    <td>1. TypeScript 源码 -> TypeScript AST</td>
    <td>词法分析与语法分析</td>
  </tr>
  <tr>
    <td>2. 类型检查器检查 AST</td>
    <td><b>核心步骤</b>：进行静态类型检查</td>
  </tr>
  <tr>
    <td>3. TypeScript AST -> JavaScript 源码</td>
    <td>擦除类型，生成目标代码</td>
  </tr>
  <tr>
    <th rowspan="3">JS (运行)</th>
    <td>4. JavaScript 源码 -> JavaScript AST</td>
    <td>引擎开始解析代码</td>
  </tr>
  <tr>
    <td>5. AST -> 字节码 (Bytecode)</td>
    <td>Ignition 解释器生成字节码</td>
  </tr>
  <tr>
    <td>6. 运行时计算字节码</td>
    <td>TurboFan 编译器优化执行</td>
  </tr>
</table>

- `Ignition` 解释器和 `TurboFan` 编译器都是 Chrome 浏览器的 `JavaScript` 引擎，`Ignition` 解释器负责解释字节码，`TurboFan` 编译器负责优化执行。

- `TSC` 是 `TypeScript` 的编译器，负责把 `TypeScript` 源码转换为 `JavaScript` 源码（类型擦除 + 语法降级），本身不参与运行时。

- 一般 `JavaScript` 引擎内部同时包含编译管线（解释器 / JIT）与运行时（堆、调用栈、GC）；浏览器或 Node 提供的 `DOM`、`fetch`、`fs` 等 API 属于宿主环境，位于引擎之外。

### 类型系统

> 类型检查器为程序分配类型时使用的一系列规则

类型系统分为两种[^1]：

- 通过显式句法告诉编译器所有值的类型
- 自动推导值的类型

[^1]: 不同语言使用的类型系统不同，例如 `JavaScript`、`Ruby`、`Python` 在运行时推导类型。`TypeScript` 要求显式声明部分类型，在编译时推导和检查剩余的部分。`Java`几乎要求显式注解所有变量的类型，然后在编译时检查。

#### TS中的类型注解语法

> 显式告知编译器变量的类型，所使用的注解语法是`value:type`

```ts
// 例如
let a: number = 10;
let b: string = "hello";
let c: boolean[] = [true, false];
```

#### 类型绑定

> `JavaScript` 是动态绑定类型，仅在运行时才知道变量的类型。`TypeScript` 是渐进式类型语言。编译前不需要知道全部类型也可自动推导部分。

#### 类型转换

> `JavaScript` 是弱类型语言，类型转换是隐式的，可以需要时自动转换类型。`TypeScript` 是强类型语言，类型转换是显式的，`JavaScript` 中的隐式转换，在`TypeScript` 中会报错。

#### 类型检查时机

> `TypeScript` 会在编译时对代码做类型检查。

#### 报错机制

> `TypeScript` 会在编译时检查类型，发现类型错误时会报错。但例如堆栈溢出，网络错误或者用户输入错误，这些运行时异常，`TypeScript` 无法捕获[^2]。

[^2]: `TypeScript` 支持增量编译，通过缓存项目状态实现按需重编，避免全量构建，大幅提升开发效率。但在现代前端构建工具（如 `Vite`）中，该特性主要加速了 IDE 的实时类型检查和 CI 流水线的校验过程。
