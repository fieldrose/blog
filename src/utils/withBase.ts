const base = import.meta.env.BASE_URL.replace(/\/+$/, "");
const baseRoot = base === "" ? "/" : `${base}/`;

/**
 * Optional versioned prefix for browser-read static files, e.g.
 * "/_assets/<version>". Set at build time only for hosts that serve
 * `public/` through a versioned static mount; unset everywhere else.
 */
const staticAssetPrefix = (
  (import.meta.env as Record<string, string | undefined>)
    .PUBLIC_ASSET_PREFIX ?? ""
).replace(/\/+$/, "");

/**
 * Strip a locale prefix from a root-relative pathname.
 * e.g. with locale "en": "/en/posts/foo" → "/posts/foo", "/en" → "/"
 * Paths that don't start with the locale prefix are returned unchanged.
 */
export function stripLocale(pathname: string, locale: string): string {
  const prefix = `/${locale}`;
  if (pathname === prefix) return "/";
  if (pathname.startsWith(`${prefix}/`)) return pathname.slice(prefix.length);
  return pathname;
}

/**
 * Strip the configured Astro `base` prefix from an absolute pathname.
 * Returns a root-relative pathname.
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
 * Prefix an asset/file path with the configured Astro `base`.
 * Does not force a trailing slash for empty paths.
 */
export function getAssetPath(path: string): string {
  // Strip leading slash to avoid double-slash when concatenating with baseRoot
  const normalizedPath = path.replace(/^\/+/, "");

  if (!normalizedPath) {
    return base === "" ? "/" : base;
  }
  return baseRoot + normalizedPath;
}

/**
 * Resolve a file served from `public/` that the browser reads directly.
 * Uses the build-time static asset prefix when present, so the file and the
 * HTML reference stay inside the versioned mount. Falls back to `base`.
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
 * Remove the build-time static asset prefix from a URL produced by Astro.
 * During prerendering, generated files are still served at their unprefixed
 * paths, so asset reads (e.g. font files for OG images) must use those paths.
 */
export function stripStaticAssetPrefix(url: string): string {
  if (!staticAssetPrefix) return url;
  return url.includes(`${staticAssetPrefix}/`)
    ? url.replace(`${staticAssetPrefix}/`, "/")
    : url;
}
