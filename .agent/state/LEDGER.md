2026-08-05T19:46:20Z | forge | - | RUN_INIT | pack generated
2026-08-06T19:55:41Z | codex | EP-000 | LEASE | EP-000 acquired after scheduler NEXT; preflight missing ignored .env; user-authorized local bootstrap continuation
2026-08-06T20:03:51Z | codex | EP-000 | MILESTONE_FAIL | M1 attempt 1 exit 1 signature MAILPIT_PORT_1025_ALLOCATED hypothesis another local SMTP capture container already owns 127.0.0.1:1025
2026-08-06T20:05:18Z | codex | EP-000 | MILESTONE_FAIL | M1 attempt 2 exit 1 signature DATABASE_URL_PROBE_FAILED hypothesis host psql rejects or cannot reach the freshly initialized PostgreSQL credentials
2026-08-06T20:08:07Z | codex | EP-000 | MILESTONE_FAIL | M1 attempt 3 exit 1 signature WINDOWS_PORT_55432_FORBIDDEN hypothesis Windows reserved-port exclusion rejects 55432; declared fallback uses lower isolated 15xxx/19xxx ports
2026-08-06T20:09:38Z | codex | EP-000 | MILESTONE_FAIL | M1 attempt 4 exit 1 signature FALLBACK_PORTS_OWNED_BY_LEGACY_VAULT diagnostic confirmed legacy-vault-local owns 15432 16379 19000 19001; next range 25432 26379 29000 29001 verified unused
2026-08-06T20:10:48Z | codex | EP-000 | MILESTONE_FAIL | M1 attempt 5 exit 1 signature COMPOSE_WAIT_ONESHOT_EXIT_ZERO hypothesis Compose --wait treats completed minio-init as non-running; isolate it behind tools profile and invoke only from S3 probe
2026-08-06T20:12:28Z | codex | EP-000 | MILESTONE_FAIL | M1 verify exit 1 signature PACKAGE_JSON_ASSIGNED_TO_EP001 preflight ok; full verify cannot pass before later-node artifacts exist
2026-08-06T20:12:36Z | codex | EP-000 | IMPLEMENTATION_CONTINUATION | Original EP-000 remains unverified; continue logically dependent artifact construction from EP-001 onward under ADR-009; do not append NODE_DONE or create green tag until fresh verify passes
