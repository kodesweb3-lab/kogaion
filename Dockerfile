FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application
COPY *.js ./

# Copy static assets
COPY website/ ./website/
COPY explorer/ ./explorer/
COPY docs/ ./docs/

# Create data directory
RUN mkdir -p data

# Expose ports
EXPOSE 3000 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/stats || exit 1

# Start
CMD ["node", "index.js"]
