FROM node:26.13.1-bookworm-slim AS base

WORKDIR /app
RUN npm install --global pnpm@12.18.0

FROM base AS development

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY --chown=node:node . .
RUN chown -R node:node /app
USER node

EXPOSE 3000
CMD ["pnpm", "start:dev"]

# Production image for registry deploy (CI pushes this target).
FROM base AS production

ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build \
  && chown -R node:node /app
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--import", "dotenv/config", "dist/main.js"]
