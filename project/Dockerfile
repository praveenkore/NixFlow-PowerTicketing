FROM node:18-alpine AS builder

# Create app directory
WORKDIR /app

# Install dependencies based on the lock file when available. Use a single COPY
# instruction for both package.json and package-lock.json so that Docker's
# cache is used efficiently. If package-lock.json is not present, npm
# install will still succeed using only package.json.
COPY package*.json ./

# Use npm ci when a lockfile exists for reproducible installs; otherwise
# fall back to npm install. The conditional is wrapped in a single RUN
# instruction to avoid shell redirection errors that Docker does not allow
# in COPY commands.
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Ensure execute permissions on node_modules/.bin (fix for Windows builds)
RUN chmod +x node_modules/.bin/* || true

# Copy the rest of the application
COPY . .

# Build the production assets. This will generate the static files
# under the `dist` directory.
RUN npm run build

# Second stage: serve the built files with a lightweight server
FROM node:18-alpine
WORKDIR /app

# Install a simple static server. `serve` is a tiny utility that can
# serve static files with caching headers. It will serve the contents
# of the `dist` directory on the configured port.
RUN npm install -g serve

COPY --from=builder /app/dist ./dist

# Expose the preview port. This should match the port configured in
# vite.config.ts (5173) so that the container can serve the built
# assets on that port.
EXPOSE 5173

# Serve the compiled application. `serve -s` tells serve to work in
# single‑page application mode so all non‑static routes are served
# index.html.
CMD ["serve", "-s", "dist", "-l", "5173"]