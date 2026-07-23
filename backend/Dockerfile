FROM node:20-alpine

WORKDIR /app/backend

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy backend code
COPY . .

# Create auth state directory for Baileys
RUN mkdir -p ./auth_info_baileys

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the backend
ENV NODE_ENV=production
ENV PORT=3000
CMD ["npm", "start"]
