// 首页签名组件
import { useEffect, useRef } from "react";
import gsap from "gsap";

interface Props {
  /** 签名文字 */
  signature: string;
  /** 动画延迟，单位秒 */
  startDelay?: number;
}

/** 遇到这些标点后停顿一拍，让打字节奏更接近真人 */
const PAUSE_AFTER = /[，。、；：！？…,.!?:;]/;

export default function HeroSignature({ signature, startDelay = 0.2 }: Props) {
  const textRef = useRef<HTMLSpanElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // 取到文字与光标的 DOM 节点，任一缺失（未渲染）就不做动画
    const textEl = textRef.current;
    const caretEl = caretRef.current;
    if (!textEl || !caretEl) return;

    // 按字符切分而非 code unit，避免中文与 emoji 被拆坏
    const chars = Array.from(signature);

    // 尊重系统「减少动效」偏好：跳过动画，直接落下完整文字
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      textEl.textContent = signature;
      gsap.set(caretEl, { opacity: 0 });
      return;
    }

    // 清空服务端渲染好的文字，准备从头打一遍
    textEl.textContent = "";
    const state = { count: 0 };

    // 光标以 steps(1) 硬切换做闪烁，与打字过程并行
    const blink = gsap.to(caretEl, {
      opacity: 0,
      duration: 0.5,
      repeat: -1,
      yoyo: true,
      ease: "steps(1)",
    });

    // 主时间线：每个字符一个补间，串行播放
    const tl = gsap.timeline({ delay: startDelay });
    chars.forEach((char, index) => {
      // 单字时长加随机抖动，形成快慢不均的打字手感
      const duration = 0.1 + Math.random() * 0.085;
      tl.to(
        state,
        {
          count: index + 1,
          duration,
          ease: "none",
          // 每帧按进度截取字符前缀写回 DOM，避免 React 重渲染
          onUpdate: () => {
            textEl.textContent = chars
              .slice(0, Math.round(state.count))
              .join("");
          },
        },
        // 标点之后额外插入停顿，位置参数用 "+=停顿" 表示
        PAUSE_AFTER.test(char) ? `+=${0.3 + Math.random() * 0.15}` : undefined
      );
    });

    // 打完后稍等片刻淡出光标，并停掉闪烁循环
    tl.to(caretEl, { opacity: 0, duration: 0.2 }, "+=0.4").call(() =>
      blink.kill()
    );

    // 卸载或依赖变化时销毁时间线与残留补间，避免重复播放
    return () => {
      tl.kill();
      gsap.killTweensOf(caretEl);
    };
  }, [signature, startDelay]);

  return (
    <p className="text-muted-foreground text-md -mt-1 mb-1.5 leading-relaxed italic">
      <span ref={textRef}>{signature}</span>
      <span
        ref={caretRef}
        aria-hidden="true"
        className="bg-accent ml-0.5 inline-block h-[1em] w-0.5 align-baseline"
      />
    </p>
  );
}
