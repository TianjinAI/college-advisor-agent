FROM node:20-alpine AS base
RUN corepack enable

# === Build Client ===
FROM base AS client-builder
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm ci
COPY client/ ./
RUN npm run build

# === Build Server ===
FROM base AS server-builder
WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm ci
COPY server/ ./
RUN npm run build

# === Production ===
FROM node:20-alpine AS production
WORKDIR /app

# Copy server build
COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=server-builder /app/server/node_modules ./server/node_modules
COPY --from=server-builder /app/server/package.json ./server/package.json

# Copy client build
COPY --from=client-builder /app/client/dist ./client/dist

# Environment file (mount at runtime)
COPY server/.env.example ./server/.env.example

EXPOSE 3001

WORKDIR /app/server
CMD ["node", "dist/index.js"]
