/**
 * 自定义 Shiki transformer，为代码块添加文件名标签。
 *
 * 该 transformer 读取代码块中的 `file="filename"` meta 属性，
 * 生成一个展示文件名的样式化标签。支持两种样式变体，
 * 并可选隐藏绿色圆点指示器。
 *
 * @param {Object} options - transformer 配置项
 * @param {string} [options.style="v2"] - 样式变体
 *   - `"v1"`：标签页风格，顶部圆角，位于左上角
 *   - `"v2"`：徽标风格，带边框，位于左上角并带偏移
 * @param {boolean} [options.hideDot=false] - 是否隐藏绿色圆点指示器
 */
export const transformerFileName = ({
  style = "v2",
  hideDot = false,
} = {}) => ({
  pre(node) {
    // 向节点写入 CSS 自定义属性
    const fileNameOffset = style === "v1" ? "0.75rem" : "-0.75rem";
    node.properties.style =
      (node.properties.style || "") + `--file-name-offset: ${fileNameOffset};`;

    const raw = this.options.meta?.__raw?.split(" ");

    if (!raw) return;

    const metaMap = new Map();

    for (const item of raw) {
      const [key, value] = item.split("=");
      if (!key || !value) continue;
      metaMap.set(key, value.replace(/["'`]/g, ""));
    }

    const file = metaMap.get("file");

    if (!file) return;

    // 为代码块增加额外外边距
    this.addClassToHast(
      node,
      `mt-8 ${style === "v1" ? "rounded-tl-none" : ""}`
    );

    // 将文件名节点插入代码块
    node.children.push({
      type: "element",
      tagName: "span",
      properties: {
        class: [
          "absolute py-1 text-foreground text-xs font-medium leading-4",
          hideDot
            ? "px-2"
            : "pl-4 pr-2 before:inline-block before:size-1 before:bg-green-500 before:rounded-full before:absolute before:top-[45%] before:left-2",
          style === "v1"
            ? "left-0 -top-6 rounded-t-md border border-b-0 bg-muted/50"
            : "left-2 top-(--file-name-offset) border rounded-md bg-background",
        ],
      },
      children: [
        {
          type: "text",
          value: file,
        },
      ],
    });
  },
});
