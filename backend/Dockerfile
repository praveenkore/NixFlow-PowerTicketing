FROM node:20-alpine

# Install OpenSSL 3.x (required for Prisma on Alpine Linux)
RUN apk add --no-cache openssl3

# Create app directory
WORKDIR /app

# Copy package files and Prisma schema first (for better caching)
COPY package.json package-lock.json* tsconfig.json ./
COPY prisma ./prisma

# Install dependencies
RUN npm install

# Generate Prisma client explicitly with schema path
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" ./node_modules/.bin/prisma generate --schema=./prisma/schema.prisma

# Copy source files
COPY src ./src

# Build TypeScript to JavaScript
RUN npm run build

# Expose the port the server runs on
EXPOSE 3000

# Run database migrations, seed the database, and start the server. The seed
# script uses ts-node to execute the TypeScript seed file defined in
# prisma/seed.ts. If the seed has already been applied it will be
# idempotent and safely upsert initial data. After seeding, the
# server is started.
CMD ["sh", "-c", "npx prisma migrate deploy && npm run seed && node dist/index.js"]