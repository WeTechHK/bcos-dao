# syntax=docker.io/docker/dockerfile:1

FROM node:22-alpine AS base
# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

COPY . .
RUN apk add --no-cache --upgrade libc6-compat bash
RUN yarn config set npmRegistryServer https://registry.npmmirror.com

RUN yarn --frozen-lockfile --network-timeout 100000
RUN yarn next:build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=development
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/packages/nextjs/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/packages/nextjs/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/packages/nextjs/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/config/next-config-js/output
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]