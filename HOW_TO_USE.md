# How to Use This Blueprint Pack
1. Extract the ZIP into an empty repository root.
2. Initialize Git and commit the blueprint.
3. Read PREFLIGHT.md, copy `.env.example` to `.env`, and use secure local values or real sandbox credentials.
4. Run `sh scripts/preflight.sh` until `preflight: ok`.
5. Give the coding agent `.agent/prompts/run-graph.md` and permit repository writes, terminal, package network, and Docker.
6. Observe `.agent/state/LEDGER.md` and Git history. Do not implement from ROADMAP.md.
7. On BLOCKED, read the active ExecPlan report, provide the one required item, reset according to recovery, and relaunch.
8. RUN_COMPLETE plus the ship gate is the only release decision. Production deployment remains manual.
