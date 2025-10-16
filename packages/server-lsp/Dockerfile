# Multi-stage build for MOVA LSP Server
# Stage 1: Builder
FROM node:20-bullseye-slim AS builder

WORKDIR /app

# Copy root files
COPY package*.json ./
COPY tsconfig.json ./
COPY .eslintrc.json ./

# Copy packages
COPY packages/schemas ./packages/schemas
COPY packages/sdk ./packages/sdk
COPY packages/server-lsp ./packages/server-lsp
COPY packages/types-node ./packages/types-node

# Install dependencies
RUN npm ci

# Build all packages
RUN npm run build

# Stage 2: Runtime
FROM node:20-bullseye-slim

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Copy only production dependencies and built artifacts
COPY package*.json ./
COPY --from=builder /app/packages/server-lsp/dist ./dist
COPY --from=builder /app/packages/server-lsp/package.json ./package.json

# Install production dependencies only
RUN npm ci --production

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start server
CMD ["node", "--enable-source-maps", "dist/server.js"]
