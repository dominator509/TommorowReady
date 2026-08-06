#!/usr/bin/env sh
set -eu
curl -fsS --max-time 10 "$S3_ENDPOINT/minio/health/live" >/dev/null
docker compose run --rm --no-deps minio-init >/dev/null
