#!/usr/bin/env sh
set -eu
[ "${NODE_ENV:-development}" != "production" ] || { echo "backup: FAIL - use the reviewed production backup workflow" >&2; exit 1; }
mkdir -p .agent/state/backups
target=".agent/state/backups/tomorrowready-local.dump"
docker compose exec -T postgres sh -eu -c 'exec pg_dump --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --format=custom --no-owner --no-acl' >"$target"
[ -s "$target" ] || { echo "backup: FAIL - empty artifact" >&2; exit 1; }
echo "backup: ok"
