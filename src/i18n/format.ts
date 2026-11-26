/**
 * 替换 UI 文案中的 `{{key}}` 占位符。
 * 译者可以在句子内自由调整占位符顺序。
 */
export function tplStr(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = vars[key];
    return value !== undefined && value !== null ? String(value) : "";
  });
}
