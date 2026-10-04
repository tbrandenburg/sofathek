#!/usr/bin/env bash
# Wait for a service to be available
# Usage: ./scripts/wait-for-it.sh <url> [timeout-seconds] [process-pid]

set -e

URL="${1:-}"
TIMEOUT="${2:-30}"
PID="${3:-}"

if [ -z "$URL" ] || ! [[ "$TIMEOUT" =~ ^[1-9][0-9]*$ ]]; then
    echo "Usage: $0 <url> [positive timeout-seconds] [process-pid]" >&2
    exit 1
fi

echo "⏳ Waiting for service at $URL..."

DEADLINE=$((SECONDS + TIMEOUT))
while [ "$SECONDS" -lt "$DEADLINE" ]; do
    if [ -n "$PID" ] && ! kill -0 "$PID" 2>/dev/null; then
        echo "Service process $PID exited before $URL became available" >&2
        exit 1
    fi
    if curl --connect-timeout 1 --max-time 2 -sf "$URL" > /dev/null 2>&1; then
        echo "✅ Service is responding at $URL"
        exit 0
    fi
    sleep 1
done

echo "Service failed to respond at $URL within $TIMEOUT seconds" >&2
exit 1
