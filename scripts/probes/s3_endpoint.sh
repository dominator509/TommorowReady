#!/usr/bin/env sh
set -eu
curl -fsS --max-time 10 "$S3_ENDPOINT" >/dev/null
