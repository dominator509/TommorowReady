#!/usr/bin/env sh
set -eu
export CI=true GIT_TERMINAL_PROMPT=0 GIT_PAGER=cat PAGER=cat DEBIAN_FRONTEND=noninteractive
[ -f package.json ] || { echo "ERROR: live-fire implementation is created in EP-007" >&2; exit 1; }
for proof in LF-01 LF-02 LF-03 LF-04 LF-05 LF-06 LF-07 LF-08 LF-09 LF-10 LF-11 LF-12 LF-13 LF-14 LF-15; do
  pnpm live-fire --proof "$proof"
done
echo "live-fire: ok"
