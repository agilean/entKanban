FROM node:22-bookworm-slim AS build

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @kanban-game/engine build \
  && pnpm --filter @kanban-game/web build \
  && pnpm --filter @kanban-game/server build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3910
ENV KANBAN_DB_PATH=/app/data/kanban-replay.db
ENV WEB_DIST_PATH=/app/packages/web/dist

RUN corepack enable

COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages

VOLUME ["/app/data"]
EXPOSE 3910

CMD ["node", "--experimental-sqlite", "packages/server/dist/index.js"]
