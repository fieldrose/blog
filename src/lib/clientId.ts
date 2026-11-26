/**
 * 匿名设备标识（UUID v4），持久化在 localStorage。
 * 通过 `x-client-id` 发送，使匿名投票在同一设备上保持一致；
 * 不与个人数据合并，首次使用时惰性生成。
 */
const STORAGE_KEY = "blog-client-id";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 读取或生成当前设备的匿名标识。
 * 无 window（SSR）时返回空字符串；已有合法 UUID 时直接复用。
 */
export function getClientId(): string {
  if (typeof window === "undefined") return "";

  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing && UUID_RE.test(existing)) return existing;

  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : fallbackUuid();

  window.localStorage.setItem(STORAGE_KEY, generated);
  return generated;
}

/** 非安全上下文下 crypto.randomUUID 的降级实现。 */
function fallbackUuid(): string {
  const hex = () =>
    Array.from({ length: 4 }, () =>
      Math.floor(Math.random() * 0x10000)
        .toString(16)
        .padStart(4, "0")
    ).join("");
  return `${hex()}-${hex().slice(0, 4)}-4${hex().slice(1, 4)}-a${hex().slice(1, 4)}-${hex()}${hex().slice(0, 4)}`.slice(
    0,
    36
  );
}
