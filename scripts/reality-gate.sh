#!/usr/bin/env sh
set -eu
PAT=".agent/reality-patterns"
ALLOW=".agent/reality-allow"
[ -f "$PAT" ] || { echo "reality gate: missing $PAT" >&2; exit 1; }
[ -f "$ALLOW" ] || { echo "reality gate: missing $ALLOW" >&2; exit 1; }
SRC_DIRS="apps packages"
hits=0
for d in $SRC_DIRS; do
  [ -d "$d" ] || continue
  out=$(grep -RInE -f "$PAT" "$d" 2>/dev/null | grep -vE -f "$ALLOW" || true)
  if [ -n "$out" ]; then printf '%s
' "$out"; hits=1; fi
done
[ "$hits" -eq 0 ] || { echo "reality gate: FAIL" >&2; exit 1; }
echo "reality gate: ok"
