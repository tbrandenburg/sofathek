#!/usr/bin/env bash
set -euo pipefail

ROOT=$(dirname "$(dirname "$(realpath "$0")")")
export SOFATHEK_BACKEND_PORT="${SOFATHEK_BACKEND_PORT:-3010}"
export SOFATHEK_FRONTEND_PORT="${SOFATHEK_FRONTEND_PORT:-8010}"

for command in node curl lsof setsid realpath; do
    command -v "$command" >/dev/null || { echo "Missing dependency: $command" >&2; exit 1; }
done
for port in "$SOFATHEK_BACKEND_PORT" "$SOFATHEK_FRONTEND_PORT"; do
    if ! [[ "$port" =~ ^[1-9][0-9]{0,4}$ ]] || ((port > 65535)); then
        echo "Invalid server port: $port" >&2
        exit 1
    fi
    if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
        echo "Port $port is occupied; existing services were left running. Use make stop before restarting Sofathek." >&2
        exit 1
    fi
done
if [ "$SOFATHEK_BACKEND_PORT" = "$SOFATHEK_FRONTEND_PORT" ]; then
    echo "Backend and frontend must use different ports" >&2
    exit 1
fi

cd "$ROOT"
if [ ! -f backend/dist/server.js ] || [ ! -f frontend/dist/index.html ]; then
    echo "Production build is missing; run make build" >&2
    exit 1
fi
VITE=$(node -p 'require("path").join(require("path").dirname(require.resolve("vite/package.json")), "bin/vite.js")')
PIDS=()
cleanup() {
    trap '' INT TERM HUP
    for pid in "${PIDS[@]}"; do
        kill -TERM -- "-$pid" 2>/dev/null || true
    done
    # Bound cleanup even if a child ignores its graceful shutdown signal.
    for pid in "${PIDS[@]}"; do
        for ((attempt = 0; attempt < 12; attempt++)); do
            kill -0 -- "-$pid" 2>/dev/null || break
            sleep 1
        done
        kill -KILL -- "-$pid" 2>/dev/null || true
        wait "$pid" 2>/dev/null || true
    done
}
trap 'cleanup' EXIT
trap 'exit 0' INT TERM HUP

echo "Starting backend on port $SOFATHEK_BACKEND_PORT..."
(cd backend && exec setsid node dist/server.js) &
PIDS+=("$!")
bash scripts/wait-for-it.sh "http://localhost:$SOFATHEK_BACKEND_PORT/health/live" 30 "${PIDS[0]}"

echo "Starting frontend on port $SOFATHEK_FRONTEND_PORT..."
(cd frontend && exec setsid node "$VITE" preview --port "$SOFATHEK_FRONTEND_PORT" --host 0.0.0.0 --strictPort) &
PIDS+=("$!")
bash scripts/wait-for-it.sh "http://localhost:$SOFATHEK_FRONTEND_PORT/" 10 "${PIDS[1]}"

echo "Sofathek is listening on the LAN at http://<server-ip>:$SOFATHEK_FRONTEND_PORT"
echo "Detailed resource health: http://localhost:$SOFATHEK_FRONTEND_PORT/health"
echo "Press Ctrl+C to stop both servers."
if wait -n "${PIDS[@]}"; then
    STATUS=1
else
    STATUS=$?
fi
echo "A server exited unexpectedly; stopping the remaining server" >&2
trap - EXIT
cleanup
exit "$STATUS"
