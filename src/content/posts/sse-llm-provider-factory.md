---
author: Mimas
pubDatetime: 2026-08-05T10:15:00Z
title: "SSE 流式输出实战：多模型工厂、AbortController 与 Agent 的八种失败处理"
slug: sse-llm-provider-factory
featured: false
draft: false
tags:
  - AI
  - SSE
  - Node.js
  - Agent
description: "让 AI 回复像 ChatGPT 一样逐字流出只是起点。这篇讲 fetch ReadableStream 解析 SSE、DeepSeek/Ollama 的 provider 工厂切换，以及超时、重试、幂等、降级等 Agent 健壮性设计。"
---

接入大模型对话时，"等整段生成完再显示"体验很差——首字延迟动辄十几秒，用户以为页面卡死。流式输出（SSE）让回答逐 token 到达，首字延迟降到几百毫秒。但流式只解决了体验问题，真正上线后 80% 的工作是处理失败：超时、限流、断流、重复副作用……这篇从传输层一路写到 Agent 的健壮性。

## Table of contents

## 一、为什么不用 EventSource

浏览器原生 `EventSource` 只支持 GET、不能带请求体和自定义鉴权头，而对话接口必须 POST 消息内容。标准做法是用 **fetch + ReadableStream** 读取 SSE 字节流：

```ts
async function streamChat(payload: ChatPayload, signal: AbortSignal) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`chat failed: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE 帧以空行分隔
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? ""; // 最后一段可能不完整，留到下次拼接
    for (const frame of frames) {
      const line = frame.replace(/^data: /, "").trim();
      if (!line || line === "[DONE]") continue;
      const chunk = JSON.parse(line);
      appendToken(chunk.choices?.[0]?.delta?.content ?? "");
    }
  }
}
```

两个易错点：**必须维护 buffer 处理跨 chunk 的半包**（一个 SSE 事件可能被 TCP 切开），以及收到 `[DONE]` 哨兵正常收尾。Node 服务端则直接把上游响应的流以 `text/event-stream` 透传，同时在服务端做鉴权、限流和供应商路由。

## 二、Provider 工厂：一套接口切换 DeepSeek 与 Ollama

我们要同时对接云端的 DeepSeek 和内网的 Ollama（私有化/离线场景）。两家 API 格式高度相似但 baseURL、鉴权、模型名都不同。用**简单工厂 + 统一接口**隔离差异，业务代码只面向接口编程：

```ts
interface ChatProvider {
  readonly name: string;
  stream(messages: Message[], signal: AbortSignal): AsyncIterable<string>;
}

class DeepSeekProvider implements ChatProvider {
  name = "deepseek";
  async *stream(messages, signal) {
    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: "deepseek-chat", messages, stream: true }),
      signal,
    });
    yield* parseSseTokens(res); // 复用同一套 SSE 解析
  }
}

class OllamaProvider implements ChatProvider {
  name = "ollama";
  async *stream(messages, signal) {
    const res = await fetch(
      "http://ollama.internal:11434/v1/chat/completions",
      {
        method: "POST",
        body: JSON.stringify({ model: "qwen2.5", messages, stream: true }),
        signal,
      }
    );
    yield* parseSseTokens(res);
  }
}

function createProvider(): ChatProvider {
  return process.env.LLM_PROVIDER === "ollama"
    ? new OllamaProvider()
    : new DeepSeekProvider();
}
```

收益很直接：开发机用云端模型、内网演示一键切 Ollama、将来加新供应商只要新增一个实现；上层的 Agent 编排、SSE 透传、前端渲染一行不用改。依赖倒置的价值在 AI 这种"供应商快速洗牌"的领域尤其明显。

## 三、超时与取消：AbortController 贯穿全链路

流式接口的超时要区分两段：**首字超时（TTFT）**和**整段完成超时**。首字 15 秒还没到说明上游排队或挂了；首字正常后流可以持续更久。

```ts
async function withTimeout<T>(p: Promise<T>, ms: number) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error("timeout")), ms);
  try {
    return await Promise.race([p, abortToPromise(ctrl.signal)]);
  } finally {
    clearTimeout(timer);
  }
}
```

用户点"停止生成"或关闭页签时，前端 abort 会传播到 Node，Node 再 abort 给供应商的请求——**整条链路都要透传取消信号**，否则上游还在烧 token 生成没人看的内容。

## 四、Agent 的八种失败场景与处理

当对话升级为 Agent（ReAct 循环：思考 → 调工具 → 观察结果 → 再思考；或用 FSM 管理任务状态），失败面急剧扩大。我们把生产环境要处理的失败归成八类：

1. **超时**：工具调用与 LLM 调用各自独立超时，用 AbortController 兜底，超时进入重试而不是无限等待；
2. **限流（429）**：指数退避 + 抖动（jitter）重试，并尊重 `Retry-After`；本地令牌桶做主动限流，避免把供应商打挂；
3. **瞬时网络错误**：对幂等的只读调用自动重试 2–3 次；
4. **非幂等副作用**：发消息、下单、写库这类操作**禁止盲目重试**，靠**幂等键（idempotency key）**保证"请求实际只生效一次"——重试时带上同一 key，服务端去重；
5. **工具返回错误**：把结构化错误作为 observation 交回模型，让它自己修正参数重试，并限制同一工具连续失败次数（防死循环）；
6. **模型输出异常**：JSON/函数调用格式解析失败时，用容错解析 + 一次"格式纠正"重问；连续失败则降级；
7. **降级（fallback）**：主模型不可用时按预案切换到备用模型或更小的模型；工具全部不可用时退化为纯文本回答，至少保住核心对话能力；
8. **循环与上下文失控**：ReAct 循环设置最大步数与总 token 预算，FSM 限定合法状态转移，异常状态强制回到"等待用户指令"，杜绝 Agent 自己绕圈烧钱。

骨架示意：

```ts
async function callToolWithGuard(tool, args, idemKey, attempt = 0) {
  try {
    return await tool.invoke(args, { idemKey, signal: toolAbort.signal });
  } catch (err) {
    if (isRateLimited(err) && attempt < 3) {
      await backoff(attempt); // 2^n * 1000 + random jitter
      return callToolWithGuard(tool, args, idemKey, attempt + 1);
    }
    if (tool.idempotent && isTransient(err) && attempt < 2) {
      return callToolWithGuard(tool, args, idemKey, attempt + 1);
    }
    throw err; // 非幂等且失败：交给 Agent 决策，而不是擅自重试
  }
}
```

## 五、流式过程中的错误怎么送达前端

HTTP 头已经发出（200）之后才出错，没法再改状态码。约定在 SSE 流末尾发错误事件，前端据此展示重试/降级提示：

```text
data: {"delta":"已经为您"}

data: {"delta":"查询"}

event: error
data: {"code":"PROVIDER_UNAVAILABLE","retryable":true}
```

配合"已生成内容保留 + 从断点重试"的交互，比直接白屏报错友好得多。

## 小结

AI 应用和传统后端在健壮性上的要求没有本质不同，只是失败更密集、成本更敏感：**传输层处理好流与取消，供应层用工厂隔离变化，编排层用重试/幂等/降级/预算八类策略覆盖失败**。把这些做在前面，Agent 才从"演示很惊艳"变成"线上靠得住"。
