# Multi-stage build untuk optimasi ukuran dan kecepatan
# Stage 1: Build dependencies
FROM node:18-alpine AS deps

# Install Chromium dan dependencies yang diperlukan
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Set environment variables untuk Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Copy hanya package files untuk layer caching yang optimal
COPY package*.json ./

# Install dependencies dengan cache mount untuk speed
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev && \
    npm cache clean --force

# Stage 2: Production image
FROM node:18-alpine AS production

# Install Chromium dan dependencies yang diperlukan
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Set environment variables untuk Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Copy dependencies dari stage sebelumnya
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./

# Copy source code
COPY index.js ./

# Buat direktori untuk Chrome user data dan cache
RUN mkdir -p /tmp/chrome-user-data /tmp/chrome-cache && \
    chmod 777 /tmp/chrome-user-data /tmp/chrome-cache

# Buat user non-root untuk keamanan
RUN addgroup -g 1001 -S nodejs && \
    adduser -S whatsapp -u 1001 -G nodejs

# Buat direktori session dan set ownership
RUN mkdir -p /app/.wwebjs_auth /app/.wwebjs_cache && \
    chown -R whatsapp:nodejs /app /tmp/chrome-user-data /tmp/chrome-cache

USER whatsapp

EXPOSE 3000

CMD ["node", "index.js"]