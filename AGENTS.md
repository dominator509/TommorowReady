# TomorrowReady Control Plane

## 1. Mission
Build a trustworthy, accessible SaaS that helps households inventory continuity records, organize evidence, schedule recurring administration, collaborate with trusted caregivers, and safely prepare or execute explicitly authorized actions without silently creating financial, legal, medical, privacy, or account consequences.

## 2. The Boot Sequence
PRIME-BLOCK-BEGIN
This repository is governed by a 6LAYER blueprint pack. AGENTS.md is the authoritative control plane; if anything here conflicts with AGENTS.md, AGENTS.md wins.
On every session start, execute THE BOOT SEQUENCE:
1. Read AGENTS.md fully. 2. Read COMMANDS.md. 3. Read .agent/GRAPH.md and .agent/LOOPS.md. 4. Run: sh scripts/ledger.sh tail 30. 5. Run: sh scripts/preflight.sh -- it MUST print "preflight: ok"; if it fails, report the exact missing items from PREFLIGHT.md and stop (this is the only legitimate pre-run stop). 6. Run: sh scripts/graph-next.sh and dispatch on its one-line output exactly as .agent/GRAPH.md specifies. 7. Repeat step 6 after every completed node until ALL_DONE, then run the ship gate in AGENTS.md.
Hard rules: do not ask the user questions; choose the smallest reversible option, record it, continue. Use only commands from COMMANDS.md. Never invent an API, route, table, flag, or env var -- verify in-repo or transcribe from the pack. One node at a time; milestones in order; commit after every milestone; append ledger events as .agent/LOOPS.md requires. Bounded retries per .agent/LOOPS.md -- never repeat a failed fix. No mocks, stubs, demo modes, or placeholder code in production paths; scripts/reality-gate.sh and scripts/live-fire.sh must genuinely pass. Never weaken a gate, skip a test, or claim an unrun result. Stop only at NODE_BLOCKED (with the full evidence report) or ALL_DONE.
PRIME-BLOCK-END

## 3. Source of truth
Current explicit user instruction > L1 control > L2 specification > L3 graph > L4 execution > repository code and tests > L5 gate output as fact > L6 state as history. Code changes when it conflicts with specifications. Gates never weaken to fit code.

## 4. Graph protocol
One node equals one ExecPlan. At most one node is IN_PROGRESS. Run `sh scripts/graph-next.sh` for every dispatch. A node is DONE only after all milestones pass, node verification prints its sentinel, expected-files audit passes, `NODE_DONE` is appended, and `green/EP-XXX` exists. Commit every milestone. Never cross a completed green tag during rollback.

## 5. Stop conditions
Stop only when: (a) preflight fails before the run; (b) an action would destroy user or production data or cause an unspecified irreversible external effect; (c) a legal, financial, medical, or security judgment is unanswered by the specifications; (d) the complete retry ladder ends in a documented `NODE_BLOCKED`; or (e) production deployment is reached while auto-deploy is not authorized. Do not ask the user for next steps, preferences, or confirmation. Proceed.

## 6. Anti-drift
At every milestone re-read its scope and non-goals. Change only declared paths. Revert unrelated changes. No broad refactors or unrelated cleanup. Audit expected files.

## 7. Anti-hallucination
Never invent package APIs, commands, environment variables, routes, tables, queues, config keys, or provider behavior. Read repository evidence or transcribe the pack. Commands come only from COMMANDS.md. Record assumptions and decisions.

## 8. Anti-fixation
Use the bounded ladder in `.agent/LOOPS.md`. Never repeat the same fix. Isolate before changing approach. Use declared fallback. Roll back, then block with evidence.

## 9. Reality law
Software that appears to work is a failure state. Only software proven by live-fire counts. No stubs, fake effects, demo paths, or placeholder implementations in production code.

## 10. Dependency rules
Prefer existing dependencies. Add only what is necessary, pin exact versions, update lockfiles and documentation, and run audits.

## 11. Commits
Use `[EP-XXX][M#] imperative summary`. Leave no unexplained changes between milestones.

## 12. Testing
Follow TESTING.md. Never skip, weaken, or rewrite a gate to pass implementation.

## 13. Layer edits
L1 is immutable during a run. L2 and L3 require documented evidence. L4 progress regions change at milestone boundaries. L5 gates only strengthen. L6 ledger is append-only.

## 14. Security
Follow SECURITY.md. Never use production data for development. Never log secrets or raw sensitive documents.

## 15. Done
Node done requires the five graph conditions. Run done requires fresh `verify.sh`, production-readiness sentinel, release tag, and either authorized deploy plus smoke or an exact manual deploy instruction.

## 16. Final response
Report nodes, expected versus changed files, commands and observed sentinels, acceptance status, decisions, assumptions, risks, deferred externals, and ship-gate status.
