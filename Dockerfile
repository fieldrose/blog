# 构建阶段：生成静态文件
FROM node:lts AS base
WORKDIR /app

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 先只拷贝依赖清单，使依赖层在源码变动时仍可复用缓存
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# 运行阶段：用 nginx 托管静态产物
FROM nginx:mainline-alpine-slim AS runtime
COPY --from=base /app/dist /usr/share/nginx/html
# 对外暴露 80 端口
EXPOSE 80
