#!/usr/bin/env bash
# Wait for a service to be available
# Usage: ./scripts/wait-for-it.sh <url> [timeout]

set -e

URL="${1:-}"
MAX_ATTEMPTS="${2:-30}"
ATTEMPT=0

if [ -z "$URL" ]; then
    echo "Usage: $0 <url> [timeout]"
    exit 1
fi

echo "⏳ Waiting for service at $URL..."

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if curl -sf "$URL" > /dev/null 2>&1; then
        echo "✅ Service is responding at $URL"
        exit 0
    fi
    ATTEMPT=$((ATTEMPT + 1))
    echo "   Attempt $ATTEMPT/$MAX_ATTEMPTS..."
    sleep 2
done

echo "❌ Service failed to respond at $URL after $MAX_ATTEMPTS attempts"
exit 1