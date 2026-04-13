# ---------- 构建 ----------
FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# 生产构建；API 基址默认走同源 /api/v1（由下方 nginx 反代）
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# ---------- 运行：nginx 托管静态资源 + 反代 ----------
FROM nginx:1.26-alpine

LABEL org.opencontainers.image.title="btg-commission-front"

# envsubst 占位符（与 docker/nginx/default.conf.template 一致）
ENV BACKEND_HOST=host.docker.internal
ENV BACKEND_PORT=8888

COPY docker/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# 官方镜像：自动将 /etc/nginx/templates/*.template 渲染为 /etc/nginx/conf.d/*.conf 后启动 nginx
