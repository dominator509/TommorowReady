#!/usr/bin/env sh
set -eu

file=.agent/state/DEFERRED_EXTERNALS.md
[ -f "$file" ] || { echo "external requirements: FAIL - missing $file" >&2; exit 1; }
for id in EXT-001 EXT-002 EXT-003 EXT-004 EXT-005 EXT-006 EXT-007 EXT-008 EXT-009 EXT-010 EXT-011 EXT-012 EXT-013 EXT-014 EXT-015 EXT-016 EXT-017 EXT-018; do
  grep -q "| $id |" "$file" || { echo "external requirements: FAIL - missing $id" >&2; exit 1; }
done
echo "external requirements: ok"
