# ==========================================
# Stage 1: Build TypeScript Backend
# ==========================================
FROM node:20-alpine AS backend-builder
WORKDIR /app
COPY backend/package*.json ./backend/
RUN npm ci --prefix backend
COPY backend/ ./backend/
RUN npm run build --prefix backend

# ==========================================
# Stage 2: Build Vite React Frontend
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./frontend/
RUN npm ci --legacy-peer-deps --prefix frontend
COPY frontend/ ./frontend/
RUN npm run build --prefix frontend

# ==========================================
# Stage 3: Final Production Runner
# ==========================================
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000
ENV DATABASE_URL="file:/app/data/dev.db"

# Install production dependencies
COPY backend/package*.json ./backend/
RUN npm ci --only=production --prefix backend

# Copy built code from builder stages
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/prisma ./backend/prisma
COPY --from=frontend-builder /app/frontend/dist ./public

# Setup persistent data folder for SQLite
RUN mkdir -p /app/data && chown -R node:node /app

# Switch to non-privileged user for security
USER node

# Expose server port
EXPOSE 5000

# Health check instructions
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "http = require('http'); http.get('http://localhost:5000/api/v1/health', (r) => { if(r.statusCode === 200) process.exit(0); else process.exit(1); }).on('error', () => process.exit(1));"

CMD ["node", "backend/dist/server.js"]
