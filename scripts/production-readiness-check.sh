#!/usr/bin/env sh
set -eu
sh scripts/verify.sh
[ "${NODE_ENV:-}" = "production" ] || { echo "production readiness: FAIL - NODE_ENV must be production" >&2; exit 1; }
[ -n "${LEGAL_APPROVAL_RECORD:-}" ] || { echo "production readiness: FAIL - legal approval evidence missing" >&2; exit 1; }
[ -n "${VENDOR_RISK_APPROVAL_RECORD:-}" ] || { echo "production readiness: FAIL - vendor approval evidence missing" >&2; exit 1; }
[ -n "${INSURANCE_EVIDENCE_RECORD:-}" ] || { echo "production readiness: FAIL - insurance evidence missing" >&2; exit 1; }
[ -n "${PRODUCTION_EVIDENCE_FILE:-}" ] || { echo "production readiness: FAIL - evidence manifest missing" >&2; exit 1; }
[ -n "${PRODUCTION_EVIDENCE_SHA256:-}" ] || { echo "production readiness: FAIL - evidence manifest hash missing" >&2; exit 1; }
[ -n "${RELEASE_COMMIT:-}" ] || { echo "production readiness: FAIL - release commit missing" >&2; exit 1; }
[ "$(git rev-parse HEAD)" = "$RELEASE_COMMIT" ] || { echo "production readiness: FAIL - release commit mismatch" >&2; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "production readiness: FAIL - worktree must be clean" >&2; exit 1; }
pnpm exec tsx scripts/validate-production-evidence.ts
pnpm exec tsx scripts/deploy-production.ts --validate-only
[ "${AUTO_DEPLOY_AUTHORIZED:-no}" = "yes" ] || { echo "production readiness: FAIL - manual production authorization required" >&2; exit 1; }
echo "production readiness: ok"
