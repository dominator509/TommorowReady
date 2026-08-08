#!/usr/bin/env sh
set -eu
[ "${NODE_ENV:-development}" != "production" ] || { echo "restore drill: FAIL - production is forbidden" >&2; exit 1; }
artifact=.agent/state/backups/tomorrowready-local.dump
[ -s "$artifact" ] || { echo "restore drill: FAIL - backup missing" >&2; exit 1; }
restore_db=tomorrowready_restore_drill
db_admin() { docker compose exec -T postgres sh -eu -c 'exec psql --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" "$@"' sh "$@"; }
cleanup() { db_admin -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS $restore_db WITH (FORCE)" >/dev/null; }
trap cleanup EXIT
cleanup
db_admin -v ON_ERROR_STOP=1 -c "CREATE DATABASE $restore_db" >/dev/null
docker compose exec -T postgres sh -eu -c 'exec pg_restore --username="$POSTGRES_USER" --dbname="$1" --no-owner --no-acl' sh "$restore_db" <"$artifact"
docker compose exec -T postgres sh -eu -c 'exec psql --username="$POSTGRES_USER" --dbname="$1" -v ON_ERROR_STOP=1 -Atc "$2"' sh "$restore_db" "SELECT count(*) >= 50 FROM information_schema.tables WHERE table_schema='public'" | grep -qx t
echo "restore drill: ok"
