#!/usr/bin/env sh
set -eu
sh scripts/verify.sh
[ -n "${LEGAL_APPROVAL_RECORD:-}" ] || { echo "production readiness: FAIL - legal approval evidence missing" >&2; exit 1; }
[ -n "${INSURANCE_EVIDENCE_RECORD:-}" ] || { echo "production readiness: FAIL - insurance evidence missing" >&2; exit 1; }
[ "${AUTO_DEPLOY_AUTHORIZED:-no}" = "yes" ] || { echo "production readiness: FAIL - manual production authorization required" >&2; exit 1; }
echo "production readiness: ok"
