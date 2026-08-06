#!/usr/bin/env sh
set -eu
if command -v redis-cli >/dev/null 2>&1; then
  redis-cli -u "$REDIS_URL" ping | grep -qx PONG
else
  docker compose exec -T valkey valkey-cli ping | grep -qx PONG
fi
