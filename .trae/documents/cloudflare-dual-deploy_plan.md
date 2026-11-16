# Context

当前站点通过 Netlify 自动构建，包含静态页面、Pagefind、构建期 Sharp OG 图和按需渲染的 Reactions API。目标是在不改变 Netlify 构建入口和运行能力的前提下，新增 Cloudflare Workers 部署；同一 GitHub 仓库提交后，由 Netlify 与 Cloudflare Workers Builds 分别自动构建和部署。

## 实施方案

1. **按构建命令选择适配器，Netlify 保持默认**
   - 修改 `astro.config.ts`：默认仍使用现有 `netlify()` 及全部参数，仅当 `ASTRO_ADAPTER=cloudflare` 时切换为 `cloudflare()`。
   - Cloudflare 分支设置 `prerenderEnvironment: "node"`，保证构建期 OG 端点的 Sharp/Buffer 可运行；设置 `imageService: "compile"`，继续使用构建期图片优化，运行期不为动态图片强制引入 Cloudflare Images binding。
   - 仅在 Cloudflare 分支禁用未使用的 Astro Sessions，避免自动创建 KV；现有标准 `APIRoute`、Supabase 和 `astro:env` 代码无需改写。

2. **新增独立的 Cloudflare 构建入口**
   - 修改 `package.json` 与 `pnpm-lock.yaml`：添加与 Astro 7.3.2 兼容的 `@astrojs/cloudflare@14.3.4`、`wrangler`，以及用于跨平台注入环境变量的 `cross-env`。
   - 新增 `build:cloudflare`，通过 `cross-env ASTRO_ADAPTER=cloudflare` 复用现有完整 `build`，继续执行类型检查、Astro 构建、Pagefind 索引和索引复制。
   - 原 `build` 与 `netlify.toml` 均不改，Netlify 仍执行 `pnpm run build`，不会误用 Cloudflare 适配器。

3. **声明 Workers 部署配置**
   - 新增 `wrangler.jsonc`：Worker 名称为 `mimas-blog`，入口为 `@astrojs/cloudflare/entrypoints/server`，静态资源绑定到 `./dist`，启用 `nodejs_compat` 与 `global_fetch_strictly_public`，并声明自定义 404 处理。
   - 不在该文件写入 Supabase、AI 或其他真实密钥；Worker 名称需与 Cloudflare 仪表盘项目一致。

4. **补齐 Cloudflare 根路径重定向**
   - 新增 `public/_redirects`，声明 `/ /zh/ 301`。Cloudflare 会在静态资源匹配前执行该规则。
   - 保留 `netlify.toml` 中现有强制 301；两处规则目标一致，Netlify 行为不变。

5. **Cloudflare 一次性平台设置**
   - 在 Workers & Pages 中从同一 GitHub 仓库创建 Worker，生产分支设为 `main`，Node.js 设为 22。
   - Build command：`pnpm build:cloudflare`；Deploy command：`pnpm exec wrangler deploy`；Preview command：`pnpm exec wrangler preview`。
   - 构建变量与 Worker 运行变量分开维护：构建变量不会自动进入运行时。至少同步配置 `PUBLIC_SITE_URL`、`PUBLIC_SUPABASE_URL`、`PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`；启用 AI 时再同步 `AI_*`。公开值配置为 Variables，服务端密钥配置为 Secrets，均不提交仓库。
   - `PUBLIC_SITE_URL` 设置为 Cloudflare 对外 canonical 域名；Supabase Authentication 增加 Cloudflare 生产及所需预览域名的 `/zh/auth/callback`、`/en/auth/callback`。Netlify 原有变量和回调继续保留。

## 后续维护方式

- 日常仍是正常修改代码并 `git push`：Netlify 和 Cloudflare 各自接收同一提交、独立安装依赖、构建、生成预览及部署，不需要手动上传 `dist`，也不要求先在其中一端构建。
- 两端构建日志、环境变量、预览和回滚分别管理；任一端失败不会自动阻塞另一端。发布前应检查两端状态。
- 两个平台可同时通过各自的 `netlify.app`、`workers.dev` 域名访问。同一自定义域名只能指向一个正式入口；若将主域名切到 Cloudflare，Netlify 部署仍可保留作为备用和预览。
- 修改站点域名时同步更新对应平台的 `PUBLIC_SITE_URL` 和 Supabase 回调白名单；新增或轮换密钥时分别更新 Netlify 与 Cloudflare，Cloudflare 还需注意构建期和运行期两处配置。

## 验证

1. 本地执行原 `pnpm build`，确认 Netlify 默认构建无回归；再执行 `pnpm build:cloudflare`，确认 Cloudflare 构建、Sharp OG、Pagefind 和类型检查通过。
2. 使用 `pnpm exec wrangler dev` 验证 `/` 返回 301 到 `/zh/`、中英双语页面、文章 OG 图、Pagefind、404，以及 Reactions GET/POST/DELETE；配置测试 Supabase 后验证登录回调。
3. 连接仓库后先验证 Cloudflare Preview，再验证生产 Worker；同时检查 Netlify 原站相同功能。
4. 最后以一次普通 Git push 确认两个平台均自动触发构建，且 canonical、OAuth 回调和动态 API 在各自域名下正确。
