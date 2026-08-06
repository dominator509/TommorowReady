# SPEC-007 Observability

Structured events include request_id, trace_id, tenant_id, household_id, actor_id, module, operation, result, latency_ms, provider, job_id, packet_id where authorized, and error_code. Never log content bodies.

Metrics cover authentication, authorization denials, cross-tenant attempts, uploads, malware results, extraction confirmation, readiness calculation, packet generation, release-state transitions, challenge timers, owner notifications, denials, manual reviews, downloads, revocations, AI cache tokens, AI cost, queue age, backups, restores, and deletion.

Alerts include unauthorized-release attempt, unusual recipient velocity, owner-notification failure during active challenge, packet isolation failure, repeated verification ambiguity, KMS failure, backup failure, purge failure, malware spike, and cross-tenant policy denial spike.
