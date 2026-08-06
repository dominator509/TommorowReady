#!/usr/bin/env sh
set -eu
[ -n "${POSTGRES_APP_PASSWORD:-}" ] || { echo "POSTGRES_APP_PASSWORD is required" >&2; exit 1; }
case "$POSTGRES_APP_PASSWORD" in *[!a-f0-9]*) echo "POSTGRES_APP_PASSWORD must be generated hexadecimal" >&2; exit 1;; esac
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set=app_password="$POSTGRES_APP_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE tomorrowready_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD %L', :'app_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tomorrowready_app') \gexec
SQL
