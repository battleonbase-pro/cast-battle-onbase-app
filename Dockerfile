# Dockerfile for Next.js Frontend
FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --legacy-peer-deps

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Set build-time environment variables
ARG NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS
ARG NEXT_PUBLIC_USDC_ADDRESS
ARG NEXT_PUBLIC_NETWORK
ARG NEXT_PUBLIC_PROJECT_NAME
ARG NEWS_SOURCE
ARG BATTLE_GENERATION_ENABLED
ARG BATTLE_DURATION_HOURS
ARG BATTLE_MAX_PARTICIPANTS

ENV NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS=$NEXT_PUBLIC_DEBATE_POOL_CONTRACT_ADDRESS
ENV NEXT_PUBLIC_USDC_ADDRESS=$NEXT_PUBLIC_USDC_ADDRESS
ENV NEXT_PUBLIC_NETWORK=$NEXT_PUBLIC_NETWORK
ENV NEXT_PUBLIC_PROJECT_NAME=$NEXT_PUBLIC_PROJECT_NAME
ENV NEWS_SOURCE=$NEWS_SOURCE
ENV BATTLE_GENERATION_ENABLED=$BATTLE_GENERATION_ENABLED
ENV BATTLE_DURATION_HOURS=$BATTLE_DURATION_HOURS
ENV BATTLE_MAX_PARTICIPANTS=$BATTLE_MAX_PARTICIPANTS

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
