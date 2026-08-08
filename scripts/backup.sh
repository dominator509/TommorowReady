#!/usr/bin/env sh
set -eu
[ "${NODE_ENV:-development}" != "production" ] || { echo "backup: FAIL - use the reviewed production backup workflow" >&2; exit 1; }
mkdir -p .agent/state/backups
plaintext=".agent/state/backups/tomorrowready-local.dump.tmp"
target=".agent/state/backups/tomorrowready-local.dump.enc"
legacy_plaintext=".agent/state/backups/tomorrowready-local.dump"
cleanup() { rm -f "$plaintext"; }
trap cleanup EXIT
rm -f "$legacy_plaintext"
docker compose exec -T postgres sh -eu -c 'exec pg_dump --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --format=custom --no-owner --no-acl' >"$plaintext"
[ -s "$plaintext" ] || { echo "backup: FAIL - empty artifact" >&2; exit 1; }
pnpm exec tsx scripts/backup-crypto.ts encrypt "$plaintext" "$target"
[ -s "$target" ] || { echo "backup: FAIL - encrypted artifact missing" >&2; exit 1; }
echo "backup: ok"
