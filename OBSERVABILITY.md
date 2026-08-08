# SPEC-007 Observability

Structured events include request_id, trace_id, tenant_id, household_id, actor_id, module, operation, result, latency_ms, provider, job_id, packet_id where authorized, and error_code. Never log content bodies.

Metrics cover authentication, authorization denials, cross-tenant attempts, uploads, malware results, extraction confirmation, readiness calculation, packet generation, release-state transitions, challenge timers, owner notifications, denials, manual reviews, downloads, revocations, AI cache tokens, AI cost, queue age, backups, restores, and deletion.

Alerts include unauthorized-release attempt, unusual recipient velocity, owner-notification failure during active challenge, packet isolation failure, repeated verification ambiguity, KMS failure, backup failure, purge failure, malware spike, and cross-tenant policy denial spike.

## SLOs
99.9 percent monthly API availability after launch stabilization; owner challenge notifications begin within five minutes for 99 percent of requests; no unauthorized release; queue age under five minutes for ordinary jobs; RPO 15 minutes and RTO 4 hours after production validation.

## Implemented controls and evidence

- The API and worker use the privacy-safe Pino instance. A bounded recursive sanitizer censors request bodies and authorization, cookie, token, password, prompt, document, packet-content, child-detail, and secret fields at arbitrary nesting while projecting only allowlisted request/response metadata.
- Operational events require request and trace identifiers, module, operation, result, and non-negative latency. Content bodies are not part of the event contract.
- Metrics accept only the declared operational names and low-cardinality labels (`module`, `operation`, `result`, `provider`, and `error_code`). Tenant, household, actor, packet, document, and content values are rejected as metric labels.
- Each required security alert resolves to a named incident runbook. Alert delivery remains production-provider dependent and must not be considered live until the production monitoring destination is configured and probed.
- API `/health/live` proves only the process. API readiness executes a real database query and pings configured Redis authentication dependencies. Web `/api/health` traverses to API readiness. Worker liveness proves the process loop and worker readiness pings its Redis stream dependency. Every failed dependency returns `503` with a bounded identifier.

Local verification proves event validation, nested credential/content redaction, bounded metrics, alert-to-runbook mapping, database readiness failure, backup, and isolated restore. Monthly availability, production notification latency, RPO, and RTO are launch SLOs and remain externally unverified until production telemetry and drills exist.
