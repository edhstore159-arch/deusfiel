FROM node:20-alpine

WORKDIR /app/backend

# Install dependencies
    COPY package.json package-lock.json ./
    RUN npm ci --prefer-offline --no-audit --no-fund

# Copy backend code
COPY . .

# Create auth state directory for Baileys
RUN mkdir -p ./auth_info_baileys

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/api/health || exit 1

# Start the backend
ENV NODE_ENV=production
ENV PORT=8080
CMD ["npm", "start"]
