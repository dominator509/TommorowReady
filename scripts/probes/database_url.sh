#!/usr/bin/env sh
set -eu
command -v psql >/dev/null 2>&1 || exit 1
psql -v ON_ERROR_STOP=1 -Atc "SELECT 1" "$DATABASE_URL" | grep -qx 1
