# Commands

Run from repository root. Coding agents must not invent commands. If a command is missing or stale, update this file first, citing repository evidence, with a Decision Log entry.

```sh
export CI=true GIT_TERMINAL_PROMPT=0 GIT_PAGER=cat PAGER=cat DEBIAN_FRONTEND=noninteractive
```

- Install: `sh scripts/install.sh`
- Activate package manager: `corepack prepare pnpm@10.34.5 --activate`
- Bootstrap lockfile: `pnpm install`
- Refresh lockfile after an approved manifest change: `pnpm install --no-frozen-lockfile`
- Preflight: `sh scripts/preflight.sh`
- Lint: `sh scripts/lint.sh`
- Format check: `sh scripts/format-check.sh`
- Format source: `pnpm exec prettier --write .`
- Restore scope drift: `git restore -- <explicit-paths>`
- Typecheck: `sh scripts/typecheck.sh`
- Unit: `sh scripts/test-unit.sh`
- Integration: `sh scripts/test-integration.sh`
- E2E: `sh scripts/test-e2e.sh`
- Browser install: `pnpm exec playwright install chromium`
- Browser accessibility: `pnpm test:browser`
- Build: `sh scripts/build.sh`
- Security: `sh scripts/security-check.sh`
- Dependency audit: `sh scripts/dependency-audit.sh`
- Smoke: `sh scripts/smoke-test.sh`
- Backup: `sh scripts/backup.sh`
- Restore drill: `sh scripts/restore-drill.sh`
- Container images: `docker build --provenance=false --target api -t tomorrowready-api:local . && docker build --provenance=false --target web -t tomorrowready-web:local . && docker build --provenance=false --target worker -t tomorrowready-worker:local .`
- Container rehearsal: `sh infrastructure/rehearse-containers.sh`
- Live-fire: `sh scripts/live-fire.sh`
- Verify: `sh scripts/verify.sh`
- Production readiness: `sh scripts/production-readiness-check.sh`
- Local infrastructure: `docker compose up -d --wait`
- Local infrastructure status: `docker compose ps`
- Local infrastructure logs: `docker compose logs --no-color --tail 200`
- Local port owner: `docker ps --filter publish=1025 --format '{{.ID}} {{.Names}} {{.Ports}}'`
- Toolchain evidence: `node --version && corepack pnpm --version && docker --version && docker compose version && git --version && psql --version && redis-cli --version`
- Dependency version evidence: `pnpm view <package> version`
- Add reviewed exact dependency: `pnpm add -w --save-exact <package>@<version>`
- Local environment: `sh scripts/bootstrap-local-env.sh`
- Local owner bootstrap: `pnpm exec tsx scripts/bootstrap-local-owner.ts` (writes ignored mode-0600 credentials to `.agent/state/local-credentials/owner.json`; never prints secrets)
- Load local environment: `set -a; . ./.env; set +a`
- External requirements inventory: `sh scripts/external-requirements.sh`
- Local start: `pnpm start > .agent/state/local.log 2>&1 & echo $! > .agent/state/local.pid; i=0; until curl -fsS http://127.0.0.1:4000/health/ready >/dev/null; do i=$((i+1)); [ "$i" -lt 30 ] || exit 1; sleep 2; done`
- Local stop: `test ! -f .agent/state/local.pid || kill "$(cat .agent/state/local.pid)"; docker compose down`
- Database migration: `pnpm db:migrate`
- Adapter parity: `for f in AGENTS.md CLAUDE.md HERMES.md OPENCLAW.md; do awk '/PRIME-BLOCK-BEGIN/,/PRIME-BLOCK-END/' "$f" | cksum; done`

Forbidden: interactive REPLs, editors, pagers, foreground watch mode, force push, history rewrite, destructive database commands outside reviewed migrations, and credential prompts.
