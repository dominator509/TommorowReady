#!/usr/bin/env sh
set -eu
fail() { echo "preflight: FAIL - $1" >&2; exit 1; }
[ -f AGENTS.md ] && [ -d .agent ] || fail "run from repository root"
for f in AGENTS.md COMMANDS.md PREFLIGHT.md .env.example .agent/GRAPH.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/reality-patterns .agent/reality-allow; do [ -f "$f" ] || fail "missing required file: $f"; done
for t in git awk grep sed curl openssl; do command -v "$t" >/dev/null 2>&1 || fail "missing required tool: $t"; done
[ -f .env ] || fail "missing .env (copy .env.example, fill REQUIRED values)"
set -a; . ./.env; set +a
[ "${AUTO_DEPLOY_AUTHORIZED:-no}" = "no" ] || fail "AUTO_DEPLOY_AUTHORIZED must remain no during local engineering"
TMP=$(mktemp); trap 'rm -f "$TMP"' EXIT
awk '/^PREFLIGHT-TABLE-BEGIN$/{t=1;next} /^PREFLIGHT-TABLE-END$/{t=0} t && NF' PREFLIGHT.md > "$TMP"
while IFS='|' read -r var req probe; do
  eval "val=\${$var:-}"
  if [ -z "$val" ]; then [ "$req" != "REQUIRED" ] || fail "env var not set: $var"; continue; fi
  if [ "$probe" != "-" ]; then [ -f "$probe" ] || fail "missing probe: $probe"; sh "$probe" >/dev/null 2>&1 || fail "credential probe failed: $var"; fi
done < "$TMP"
sh scripts/external-requirements.sh >/dev/null
echo "preflight: ok"
