#!/usr/bin/env sh
set -eu
command -v redis-cli >/dev/null 2>&1 || exit 1
redis-cli -u "$REDIS_URL" ping | grep -qx PONG
