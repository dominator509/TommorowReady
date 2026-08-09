#!/usr/bin/env sh
set -eu
[ -n "${POSTGRID_API_KEY:-}" ] || { echo "postgrid probe: FAIL - POSTGRID_API_KEY missing" >&2; exit 1; }
curl -fsS --max-time 20 \
  -H "x-api-key: ${POSTGRID_API_KEY}" \
  'https://api.postgrid.com/print-mail/v1/letters?limit=1' >/dev/null
echo "postgrid probe: ok"
