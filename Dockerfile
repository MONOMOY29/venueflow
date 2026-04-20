# ── Build Stage ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files first (layer cache optimisation)
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# ── Runtime Stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# Security: run as non-root user
RUN addgroup -S venueflow && adduser -S venueflow -G venueflow

WORKDIR /app

# Copy installed node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY --chown=venueflow:venueflow . .

# Switch to non-root user
USER venueflow

# Cloud Run listens on $PORT (default 8080)
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

# Health check for Cloud Run (optional but good practice)
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', r => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
