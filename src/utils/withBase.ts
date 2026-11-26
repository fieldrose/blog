const base = import.meta.env.BASE_URL.replace(/\/+$/, "");
const baseRoot = base === "" ? "/" : `${base}/`;

/**
 * 浏览器直接读取的静态文件可选版本化前缀，例如 "/_assets/<version>"。
 * 仅在通过版本化静态挂载对外提供 `public/` 的宿主上于构建期设置，
 * 其余环境保持为空。
 */
const staticAssetPrefix = (
  (import.meta.env as Record<string, string | undefined>)
    .PUBLIC_ASSET_PREFIX ?? ""
).replace(/\/+$/, "");

/**
 * 从根相对路径中剥离 locale 前缀。
 * 例如 locale 为 "en" 时："/en/posts/foo" → "/posts/foo"、"/en" → "/"。
 * 不以该 locale 前缀开头的路径原样返回。
 */
export function stripLocale(pathname: string, locale: string): string {
  const prefix = `/${locale}`;
  if (pathname === prefix) return "/";
  if (pathname.startsWith(`${prefix}/`)) return pathname.slice(prefix.length);
  return pathname;
}

/**
 * 从绝对路径中剥离已配置的 Astro `base` 前缀，返回根相对路径。
 */
export function stripBase(pathname: string): string {
  if (base === "") {
    return pathname;
  }
  if (pathname === base) {
    return "/";
  }
  if (pathname.startsWith(baseRoot)) {
    const stripped = pathname.slice(base.length);
    return stripped === "" ? "/" : stripped;
  }
  return pathname;
}

/**
 * 为资源/文件路径添加已配置的 Astro `base` 前缀。
 * 空路径不会强制补尾斜杠。
 */
export function getAssetPath(path: string): string {
  // 剥离前导斜杠，避免与 baseRoot 拼接时出现双斜杠
  const normalizedPath = path.replace(/^\/+/, "");

  if (!normalizedPath) {
    return base === "" ? "/" : base;
  }
  return baseRoot + normalizedPath;
}

/**
 * 解析浏览器直接读取的 `public/` 文件路径。
 * 存在构建期静态资源前缀时优先使用，使文件与 HTML 引用都落在版本化挂载内；
 * 否则回退到 `base`。
 */
export function getStaticAssetPath(path: string): string {
  const normalizedPath = path.replace(/^\/+/, "");

  if (staticAssetPrefix) {
    return normalizedPath
      ? `${staticAssetPrefix}/${normalizedPath}`
      : `${staticAssetPrefix}/`;
  }
  return getAssetPath(normalizedPath);
}

/**
 * 从 Astro 生成的 URL 中移除构建期静态资源前缀。
 * 预渲染阶段生成的文件仍以无前缀路径提供，因此资源读取（例如 OG 图所用字体）
 * 必须使用这些路径。
 */
export function stripStaticAssetPrefix(url: string): string {
  if (!staticAssetPrefix) return url;
  return url.includes(`${staticAssetPrefix}/`)
    ? url.replace(`${staticAssetPrefix}/`, "/")
    : url;
}
