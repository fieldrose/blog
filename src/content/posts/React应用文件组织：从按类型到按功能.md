---
author: Mimas
pubDatetime: 2026-10-29T02:00:00Z
modDatetime: 2026-10-29T02:30:00Z
title: "React 应用的文件组织：从按类型到按功能"
slug: React应用文件组织：从按类型到按功能
featured: false
draft: false
tags:
  - React
  - 工程化
  - 架构
  - 文件组织
description: "译自 Max Stoiber 的 How To Scale React Applications，整理其中与文件组织相关的部分：容器与组件分离、按功能分组、CSS Modules 与组件级 reset、saga 作为跨组件协作层，并附一份后续技术演变的对照说明。"
---

## Table of contents

本文译自 Max Stoiber 的 [How To Scale React Applications](https://www.smashingmagazine.com/2016/09/how-to-scale-react-applications/)（Smashing Magazine，2016 年 9 月 8 日，React Boilerplate v3 的配套文章）。

关于作者需要说明一点：该文作者是 Max Stoiber（React Boilerplate 与 styled-components 的作者），网络上常被误标为 Dan Abramov 所作。Dan Abramov 关于文件组织的公开表述是「Move files around until it feels right」，即通过反复移动文件来找到合适的结构。

原文还包含 Docker 部署与 CI 的章节，与文件组织无关，本文只译整理架构相关部分。

## 一、规模化的三个维度

传统上，扩展是后端的话题：用户增加就增加服务器，数据库压力增大就分库分表。

富客户端应用把扩展问题带到了前端。原文认为，复杂应用的前端需要同时应对三种增长：

| 维度          | 增长的表现                 | 失控的后果                 |
| ------------- | -------------------------- | -------------------------- |
| 用户          | 流量、并发、首屏体积       | 性能问题                   |
| 开发者        | 从 3 人增加到 30 人        | 协作冲突增加               |
| 模块（parts） | 从 20 个组件增加到 2000 个 | 文件难以定位，改动风险上升 |

文件组织处理的是后两个维度。原文的判断是：结构不合理时，团队规模与代码规模上升后问题会集中出现。

## 二、容器与组件分离

原文提出的第一个改进，是把组件分为两类：

- 容器（Container）：有状态、连接数据、负责数据与状态管理，通常不包含样式
- 组件（Component）：包含样式，不负责数据与状态

可以用一句话概括：容器负责逻辑如何运作，组件负责界面如何呈现。

这样划分的收益是改动范围的隔离：

- 修改样式时不必担心影响数据结构
- 修改数据流时不必担心影响样式

原文将这一收益描述为代码清晰度的显著提升。这一思路在 Hooks 之后演化为「组合式函数 + 纯展示组件」，动机保持一致。

## 三、从按类型分组到按功能分组

### 3.1 传统做法：按类型分组

多数教程按文件类型划分目录：

```
react-app-by-type
 ├── css
 ├── actions
 │   └── NavBarActions.js
 ├── containers
 │   └── NavBar.jsx
 ├── constants
 │   └── NavBarConstants.js
 ├── components
 │   └── App.jsx
 └── reducers
     └── NavBarReducer.js
```

这一结构适合示例项目。但当组件数量达到几百甚至上千后，会出现三个问题：

- 新增一个功能，需要在六个不同目录中分别定位
- 了解某个组件涉及哪些文件，只能依赖全局搜索逐个跳转
- 多人协作时集中在同一批目录修改，冲突概率上升

原文对此的描述是：这类操作会很快变得繁琐，团队对代码库的信心也会随之下滑。

### 3.2 改进做法：按功能分组

把同一功能相关的所有文件放入同一个目录：

```
react-app-by-feature
 ├── css
 ├── containers
 │   └── NavBar
 │       ├── NavBar.jsx
 │       ├── actions.js
 │       ├── constants.js
 │       └── reducer.js
 └── components
     └── App.jsx
```

两种结构的对比：

| 动作                   | 按类型                   | 按功能                   |
| ---------------------- | ------------------------ | ------------------------ |
| 新增一个功能           | 在 6 个目录各建 1 个文件 | 建 1 个目录              |
| 定位一个功能的全部代码 | 全局搜索后逐个跳转       | 打开 1 个目录            |
| 重命名一个功能         | 跨目录替换，容易遗漏     | 目录改名后全局替换       |
| 多人并行开发           | 同一目录冲突较多         | 各自在不同功能目录中工作 |

原文作者提到，他最初对这种组织方式持怀疑态度，认为原有做法已经够用；在一个小项目中试用后改变了看法，对代码库的可维护性评价明显提升。

### 3.3 容易误解的一点

按功能分组不意味着这些 action 和 reducer 只能由该组件使用。

相反，它们可以被其他组件导入复用。功能目录是内聚的边界，不是封闭的私有范围。区分这两点，是理解该结构的前提。

## 四、样式文件的组织

CSS 在组件化架构中有两个固有难点：全局命名与属性继承。

### 4.1 全局命名冲突

假设代码中存在如下样式：

```css
.header {
  /* … */
}
.title {
  background-color: yellow;
}
```

`title` 是通用名称。若另一位开发者在其他文件中写入：

```css
.footer {
  /* … */
}
.title {
  border-color: blue;
}
```

两处声明会作用于同一批元素，节目标题会同时带上黄色背景与蓝色边框。排查时需要在上千个文件中定位到具体声明。

### 4.2 解法：样式与组件同目录（CSS Modules）

CSS Modules 的做法是把组件样式文件放入组件自身目录：

```
react-app-with-css-modules
 ├── containers
 └── components
     └── Button
         ├── Button.jsx
         └── styles.css
```

样式内容基本不变，但类名可以使用通用命名：

```css
.button {
  /* … */
}
```

在组件中导入并绑定：

```jsx
/* Button.jsx */
var styles = require("./styles.css");

<div className={styles.button}></div>;
```

最终渲染结果为：

```html
<div class="MyApp__button__1co1k"></div>
```

CSS Modules 会为类名加上应用名前缀与内容哈希后缀。原文对此给出的结论是：类名冲突的概率极低；若两个类名冲突，说明内容哈希相同，即样式本身一致，因此不会产生实际的样式覆盖问题。

### 4.3 属性继承带来的样式污染

CSS 中有十余条可继承属性，包括 `line-height`、`color`、`font-size`、`letter-spacing` 等。

若 `Header` 与 `Footer` 分别设置：

```css
.header {
  line-height: 1.5em;
}
.footer {
  line-height: 1;
}
```

同一 `Button` 组件在两处渲染时外观会不一致。这类问题不会报错，排查成本较高。

### 4.4 解法：组件级 reset

常规做法是用 reset 样式表统一浏览器差异（Reset CSS、Normalize.css、sanitize.css）。

原文提出将该动作下沉到组件级别：为每个组件包裹一层局部 reset，把可继承属性重置为默认值，阻断来自外部的继承。

落地方式为 PostCSS 插件 [postcss-autoreset](https://github.com/maximkoretskiy/postcss-autoreset)：

```js
// postcss.config.js
module.exports = {
  plugins: {
    "postcss-autoreset": {},
  },
};
```

由此可以归纳为一条原则：样式要么与组件同目录（处理命名冲突），要么在组件边界重置（处理继承污染）。两者都未处理的组件，其独立性是不完整的。

## 五、数据获取的位置

按功能分组适用于多数 action，但数据获取是全局性的，不属于某一个组件。

### 5.1 Thunk 的两个问题

原文写作时，主流做法是 redux-thunk：

```js
/* actions.js */
function fetchData() {
  return function thunk(dispatch) {
    fetch("https://someurl.com/someendpoint", function callback(data) {
      dispatch(dataLoaded(data));
    });
  };
}
```

原文指出的两个问题：

1. 测试成本上升：纯 action creator 可以直接断言，返回 thunk 后需要双重调用、mock `dispatch` 与网络
2. 概念归属不清：数据获取属于副作用，放在 action 中语义上并不合适

### 5.2 redux-saga：异步流程的可测试写法

```js
/* sagas.js */
import { call, take, put } from "redux-saga/effects";

function* fetchData() {
  yield take(FETCH_DATA); // 等待该 action 发生
  var data = yield call(fetch, "https://someurl.com/someendpoint"); // 等待请求完成
  put(dataLoaded(data)); // 派发结果
}
```

generator 与 `yield` 使异步流程的书写形式接近同步代码。原文对此的评价是：这种写法避免了回调嵌套，同时便于测试。

便于测试的原因是 saga 导出的 effects 都是可断言的值，无需实际执行：

| Effect     | 作用                                       |
| ---------- | ------------------------------------------ |
| `put()`    | 派发一个 action                            |
| `take()`   | 暂停执行，直到指定 action 发生             |
| `select()` | 读取一部分 state（类似 `mapStateToProps`） |
| `call()`   | 调用函数并等待结果                         |

测试因此可以逐步骤比对，不需要 mock，也不需要网络与应用实例：

```js
/* sagas.test.js */
var sagaGenerator = fetchData();

it("should wait for the FETCH_DATA action", function () {
  expect(sagaGenerator.next()).to.equal(take(FETCH_DATA));
});

it("should fetch the data from the server", function () {
  expect(sagaGenerator.next()).to.equal(
    call(fetch, "https://someurl.com/someendpoint")
  );
});

it("should dispatch the dataLoaded action when the data has loaded", function () {
  expect(sagaGenerator.next()).to.equal(put(dataLoaded()));
});
```

原文同时给出了一个文件组织上的决定：测试文件与被测文件放在同一目录。理由是：一个组件的全部文件（包括测试）应当位于同一处，没有理由单独建立镜像目录。

### 5.3 saga 作为组件间的协作层

这一节讨论组件之间的通信方式。

组件在样式与逻辑上已经解耦，但业务中组件之间仍需通信。例如点击 `Clock` 的按钮启动 `Timer`，点击 `Timer` 的停止按钮后由 `Clock` 显示时间。

常规写法是互相导入对方的 action：

```jsx
/* Clock.jsx */
import { startTimer } from "../Timer/actions";
<button onClick={this.props.dispatch(startTimer())} />;

/* Timer.jsx */
import { showTime } from "../Clock/actions";
<button onClick={this.props.dispatch(showTime(currentTime))} />;
```

这样两个组件形成直接依赖，单独复用的成本很高。

改进方式是让组件只派发自身的 action：

```jsx
/* Clock.jsx */
import { startButtonClicked } from "../Clock/actions";
<button onClick={this.props.dispatch(startButtonClicked())} />;

/* Timer.jsx */
import { stopButtonClicked } from "../Timer/actions";
<button onClick={this.props.dispatch(stopButtonClicked(currentTime))} />;
```

再由外层的 saga 负责把两者连接起来：

```js
/* sagas.js */
function* clockAndTimer() {
  yield take(START_BUTTON_CLICKED); // 监听 Clock 自身的事件
  put(startTimer()); // 触发 Timer 的行为
  // …
}
```

原文将 saga 描述为两个解耦组件之间的「砂浆（mortar）」：

```
Clock 组件 ──派发自身 action──▶ ┐
                                 ├── saga（协作层）──▶ 驱动其他组件
Timer 组件 ──派发自身 action──▶ ┘
```

由此得到一条通用的解耦规则：组件只负责自身，跨组件的协作交由上层（saga、中间件或事件总线）编排，组件的导入列表中不应出现兄弟组件的 action。

## 六、要点归纳

将原文主张整理为一张检查表：

1. 按功能划分目录，不按文件类型划分。一个功能对应一个目录。
2. 容器负责逻辑，组件负责展示。纯展示组件中不出现数据请求与全局状态。
3. 一个功能的全部文件放在一起：组件、样式、类型、常量、reducer、测试。
4. 样式与组件同目录，并用 CSS Modules 或同类方案保证类名唯一。
5. 在组件边界做样式隔离，切断继承污染。
6. 测试与源码同目录，不单独建立 `__tests__` 镜像目录。
7. 组件只派发自身的 action，跨组件协作交给上层编排。
8. 功能目录是内聚边界而非私有范围，内部产物应对其他功能开放复用。
9. 数据获取放在 saga、中间件或查询层，不放在组件的 action 中。
10. 命名具体到功能：`NavBar/` 优于 `navigation/`，`useNavBarToggle` 优于 `useToggle`。

## 七、附注：原文主张的后续演变

以下为译者在 2026 年的补充说明，不属于原文内容，仅对照技术选型的变化。

| 原文主张                    | 后续变化                                                      | 原则是否延续                             |
| --------------------------- | ------------------------------------------------------------- | ---------------------------------------- |
| 按功能分组（feature-first） | 仍是主流实践，bulletproof-react、Feature-Sliced Design 均采用 | 延续                                     |
| 容器与组件分离              | 演化为组合式函数加纯展示组件                                  | 延续                                     |
| CSS Modules 处理命名冲突    | 同类方案增多：CSS Modules、CSS-in-JS、Tailwind、scoped style  | 延续                                     |
| 组件级 reset 处理继承       | 同类思路：`@layer`、`all: initial`、Shadow DOM                | 延续                                     |
| redux-saga 作为数据层       | 多数场景由 TanStack Query、SWR、RSC 承担                      | 具体工具更替，副作用与组件分离的原则延续 |
| saga 作为跨组件协作层       | 由状态管理、事件总线、组合式函数承担                          | 同上                                     |

原文未覆盖的场景是 monorepo 与包级边界。当前多数前端项目在 `apps/` 与 `packages/` 之上再按功能切分，切分逻辑与原文一致，区别在于边界单位由目录变为包。

## 参考来源

- 原文：[How To Scale React Applications — Max Stoiber, Smashing Magazine (2016)](https://www.smashingmagazine.com/2016/09/how-to-scale-react-applications/)
- React Boilerplate v3：[mxstbr/react-boilerplate](https://github.com/mxstbr/react-boilerplate)
- CSS Modules：[css-modules/css-modules](https://github.com/css-modules/css-modules)
- postcss-autoreset：[maximkoretskiy/postcss-autoreset](https://github.com/maximkoretskiy/postcss-autoreset)
- redux-saga：[redux-saga/redux-saga](https://github.com/redux-saga/redux-saga)
