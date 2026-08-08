#!/usr/bin/env sh
set -eu
sh scripts/preflight.sh
sh scripts/lint.sh
sh scripts/format-check.sh
sh scripts/typecheck.sh
sh scripts/test-unit.sh
sh scripts/test-integration.sh
sh scripts/test-e2e.sh
pnpm test:browser
echo "browser accessibility: ok"
NODE_ENV=production sh scripts/build.sh
sh scripts/security-check.sh
sh scripts/dependency-audit.sh
sh scripts/reality-gate.sh
sh scripts/smoke-test.sh
sh scripts/live-fire.sh
sh scripts/backup.sh
sh scripts/restore-drill.sh
echo "verify: ok"
