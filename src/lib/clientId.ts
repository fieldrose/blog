/**
 * Anonymous device identifier (UUID v4), persisted in localStorage.
 * Sent as `x-client-id` so anonymous votes stay consistent on this device.
 * Never merged with personal data; generated lazily on first use.
 */
const STORAGE_KEY = "blog-client-id";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

/** crypto.randomUUID fallback for non-secure contexts. */
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
