#!/usr/bin/env sh
set -eu
[ -n "${LOB_API_KEY:-}" ] || { echo "lob probe: FAIL - LOB_API_KEY missing" >&2; exit 1; }
curl -fsS --max-time 20 --user "${LOB_API_KEY}:" \
  -H 'Lob-Version: 2024-01-01' \
  'https://api.lob.com/v1/letters?limit=1' >/dev/null
echo "lob probe: ok"
