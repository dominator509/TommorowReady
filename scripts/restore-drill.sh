#!/usr/bin/env sh
set -eu
[ "${NODE_ENV:-development}" != "production" ] || { echo "restore drill: FAIL - production is forbidden" >&2; exit 1; }
set -a; . ./.env; set +a
artifact=.agent/state/backups/tomorrowready-local.dump
[ -s "$artifact" ] || { echo "restore drill: FAIL - backup missing" >&2; exit 1; }
restore_db=tomorrowready_restore_drill
base_url=${DATABASE_MIGRATION_URL%/*}
cleanup() { psql "$DATABASE_MIGRATION_URL" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS $restore_db WITH (FORCE)" >/dev/null; }
trap cleanup EXIT
cleanup
psql "$DATABASE_MIGRATION_URL" -v ON_ERROR_STOP=1 -c "CREATE DATABASE $restore_db" >/dev/null
pg_restore --dbname="$base_url/$restore_db" --no-owner --no-acl "$artifact"
psql "$base_url/$restore_db" -v ON_ERROR_STOP=1 -Atc "SELECT count(*) >= 50 FROM information_schema.tables WHERE table_schema='public'" | grep -qx t
echo "restore drill: ok"
