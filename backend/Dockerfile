# Build from the repository root: docker build -f backend/Dockerfile .
FROM node:24-bookworm-slim AS builder
WORKDIR /app
ARG SOFATHEK_YTDLP_VERSION
ENV SOFATHEK_YTDLP_VERSION=${SOFATHEK_YTDLP_VERSION}

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
# Lifecycle scripts are run explicitly: Docker uses system ffmpeg, not ffmpeg-static.
RUN npm ci --workspace=backend --include-workspace-root=false --ignore-scripts
COPY backend/scripts ./backend/scripts
RUN node backend/scripts/installYtDlp.js
COPY backend/tsconfig.json ./backend/tsconfig.json
COPY backend/src ./backend/src
RUN npm run build --workspace=backend && \
    npm prune --omit=dev --workspace=backend --include-workspace-root=false --ignore-scripts

FROM node:24-bookworm-slim AS runtime
ARG SOFATHEK_YTDLP_VERSION
ENV NODE_ENV=production SOFATHEK_YTDLP_VERSION=${SOFATHEK_YTDLP_VERSION}
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && \
    rm -rf /var/lib/apt/lists/* && \
    addgroup --system --gid 1001 sofathek && \
    adduser --system --uid 1001 --ingroup sofathek sofathek

WORKDIR /app/backend
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder --chmod=644 /app/backend/package.json ./package.json
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/.runtime ./.runtime
RUN ln -s /usr/bin/ffmpeg /app/node_modules/ffmpeg-static/ffmpeg && \
    mkdir -p /app/data/videos /app/data/temp /app/logs && \
    ln -s /app/logs ./logs && \
    chown sofathek:sofathek /app/data/videos /app/data/temp /app/logs
ENV VIDEOS_DIR=/app/data/videos TEMP_DIR=/app/data/temp
USER sofathek
EXPOSE 3010
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "fetch('http://localhost:' + (process.env.SOFATHEK_BACKEND_PORT || 3010) + '/health').then(r => { if (!r.ok) process.exit(1); }).catch(() => process.exit(1))"
CMD ["node", "dist/server.js"]
