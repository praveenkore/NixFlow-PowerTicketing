# Build stage
FROM node:20-alpine AS builder

# Install OpenSSL 3.x (required for Prisma on Alpine Linux)
RUN apk add --no-cache openssl3

WORKDIR /build

# Copy backend and worker
COPY backend ./backend
COPY worker ./worker

# Build worker
WORKDIR /build/worker

# Install dependencies
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy schema locally to ensure generation goes to worker's node_modules
RUN mkdir -p ./prisma && cp ../backend/prisma/schema.prisma ./prisma/schema.prisma

# Generate Prisma client
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

# Install OpenSSL 3.x
RUN apk add --no-cache openssl3

WORKDIR /app

# Copy built files
COPY --from=builder /build/worker/package*.json ./
COPY --from=builder /build/worker/dist ./dist
# We need the compiled backend files inside worker/dist
COPY --from=builder /build/worker/dist/backend ./backend

# Install production dependencies
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# Copy Prisma client and schema
COPY --from=builder /build/worker/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /build/worker/prisma ./prisma

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Switch to non-root user
USER nodejs

# Start worker service
# Based on tsc output structure, it's dist/worker/src/index.js
CMD ["node", "dist/worker/src/index.js"]
