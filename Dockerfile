# Multi-stage build for Vite + React frontend

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source files
COPY . .

# Build the frontend
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /app

# Install only production dependencies for the static server
COPY package.json package-lock.json ./
RUN npm ci --production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy server.js (static file server)
COPY server.js .

# Expose port
EXPOSE 4173

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:4173 || exit 1

# Start the static server
ENV PORT=4173
CMD ["node", "server.js"]
