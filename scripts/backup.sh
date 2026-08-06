#!/usr/bin/env sh
set -eu
[ "${NODE_ENV:-development}" != "production" ] || { echo "backup: FAIL - use the reviewed production backup workflow" >&2; exit 1; }
set -a; . ./.env; set +a
mkdir -p .agent/state/backups
target=".agent/state/backups/tomorrowready-local.dump"
pg_dump "$DATABASE_MIGRATION_URL" --format=custom --no-owner --no-acl --file="$target"
[ -s "$target" ] || { echo "backup: FAIL - empty artifact" >&2; exit 1; }
echo "backup: ok"
