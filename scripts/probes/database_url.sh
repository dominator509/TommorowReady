#!/usr/bin/env sh
set -eu
command -v psql >/dev/null 2>&1 || exit 1
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -Atc "SELECT 1" | grep -qx 1
