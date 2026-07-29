FROM node:20-alpine

# Set working directory
WORKDIR /app/backend/ai-builder

# Install dependencies
COPY backend/ai-builder/package.json ./

RUN npm install --production

# Copy ai-builder code
COPY backend/ai-builder/ ./

# Expose port
EXPOSE 4321

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:4321/health || exit 1

# Start the service
CMD ["npm", "start"]
