# Build Stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .

# Принудительно задаем домены для билда Next.js, чтобы они вшились в JS
ARG NEXT_PUBLIC_API_DOMAIN=https://auth.juvantia.org
ARG NEXT_PUBLIC_WEBSITE_DOMAIN=https://auth.juvantia.org
ENV NEXT_PUBLIC_API_DOMAIN=$NEXT_PUBLIC_API_DOMAIN
ENV NEXT_PUBLIC_WEBSITE_DOMAIN=$NEXT_PUBLIC_WEBSITE_DOMAIN

# Пропускаем проверку типов в сборке для скорости, если нужно (или оставляем для надежности)
RUN npm run build

# Production Stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Копируем публичные файлы (изображения, шрифты и т.д.)
COPY --from=builder /app/public ./public

# Копируем самодостаточную сборку Next.js
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
