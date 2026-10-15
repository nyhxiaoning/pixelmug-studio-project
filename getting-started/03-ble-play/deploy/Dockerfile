FROM node:20-bookworm-slim AS deps
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV BOT_ENTRY="bot/index.js"
ENV HAS_WEBAPP="1"
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/package-lock.json* ./
COPY bot ./bot
COPY webapp-dist ./webapp-dist
COPY deploy ./deploy
USER node
EXPOSE 8080
CMD ["node", "deploy/start.mjs"]
