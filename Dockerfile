FROM node:24-bookworm-slim AS development

WORKDIR /app
RUN npm install --global pnpm@12.18.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY --chown=node:node . .
RUN chown -R node:node /app
USER node

EXPOSE 3000
CMD ["pnpm", "start:dev"]
