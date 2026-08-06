# TomorrowReady Architecture

## Purpose
Define a low-cost, scalable, security-first architecture for a standalone family continuity SaaS serving at least 1,000 household profiles and scaling horizontally without a rewrite.

## System overview
A Next.js web application communicates with a Fastify modular monolith. PostgreSQL is authoritative. Valkey provides queues, distributed locks, rate limits, and disposable cache. Private S3-compatible object storage holds quarantined uploads, immutable originals, approved media, packet artifacts, and encrypted exports. Workers run malware scanning, normalization, extraction, media processing, reminder jobs, packet generation, release notifications, and deletion. A dedicated Emergency Release Service evaluates deterministic policy; AI never decides release.

## Repository map
- `apps/web`: accessible household, helper, recipient, and support user interfaces.
- `apps/api`: HTTP boundary, authentication, tenant context, authorization, orchestration, webhook validation.
- `apps/worker`: resumable document, media, notification, packet, release, export, and purge jobs.
- `apps/report-renderer`: deterministic PDF and printable binder rendering.
- `packages/domain`: pure entities, state machines, value objects, readiness rules, release rules.
- `packages/application`: use cases and provider ports.
- `packages/infrastructure`: PostgreSQL, storage, email, SMS, AI, transcription, billing, KMS, and print adapters.
- `packages/contracts`: locked schemas, routes, events, and error envelopes.
- `packages/ui`: accessible components and design tokens.

## Code import law
1. Domain imports no framework, database, network, filesystem, UI, or model-provider code.
2. Application imports domain and declared ports only.
3. Infrastructure implements ports and may import application contracts, never UI.
4. API and workers compose application and infrastructure.
5. Web consumes contracts and API clients, never persistence modules.
6. Emergency release rules live in domain code and cannot import AI or provider implementations.
7. Cross-tenant queries are forbidden outside narrowly scoped, audited platform-administration services.

## Core modules
Identity; Household; People; Dependents; Children; Guardians and Caregivers; Pets; Trusted Helpers; Professional Contacts; Account and Asset Inventory; Insurance; Debts; Property; Storage Units; Document Locations; Home Operations; Child Continuity; Pet Continuity; Medical Information; Funeral Wishes; Business Continuity; Letters; Videos; Advice; Photos; Recipes; Evidence; Family Readiness Score; Family IQ; Packets; Packet Recipients; Emergency Policies; Access Requests; Verification; Challenge and Denial; Release Evidence; Annual Review; Consent; Privacy Requests; Exports; Billing; AI Gateway; Audit; Support Administration.

## Authoritative data model
PostgreSQL stores confirmed facts, statuses, recipient scopes, policy versions, consent, approvals, access events, evidence, and immutable audit references. Object storage holds bytes. Valkey is never authoritative. AI output is always a suggestion or generated artifact, never authority.

## Emergency access state machine
`DRAFT -> ARMED -> REQUESTED -> VERIFYING -> CHALLENGE_ACTIVE -> APPROVED_FOR_RELEASE -> RELEASED | DENIED | EXPIRED | CANCELLED | MANUAL_REVIEW_REQUIRED`.

Transitions require explicit policy predicates. `APPROVED_FOR_RELEASE` requires the configured verification threshold, an unexpired challenge period, no owner denial, no unresolved takeover signal, recipient identity verification, and packet-scope match. A provider timeout or conflicting evidence becomes `MANUAL_REVIEW_REQUIRED`, never success.

## Packet compartmentalization
Each packet has one purpose, explicit content selectors, one or more recipients, visibility rules, release policy, review date, and immutable manifest version. The default packet contains no raw passwords or authentication secrets. A childcare recipient cannot infer or enumerate financial or executor packets. Object paths, database queries, cache keys, notifications, exports, and audit views enforce packet and tenant boundaries.

## AI boundary
All model calls pass through `packages/infrastructure/ai-gateway`. The gateway checks AI consent, classifies data, blocks prohibited secrets, pseudonymizes where possible, constructs stable prompt prefixes, validates structured output, records cache and cost metrics, and attaches evidence references. Allowed uses include interview phrasing, gap explanations, plain-language summaries, classification, drafting letters, and recipe transcription. Prohibited uses include release decisions, legal authority determinations, incapacity or death determinations, guardianship advice, secret storage, and unverified claims presented as fact.

## Family Readiness Score
The score is deterministic and versioned. It uses confirmed completion, review freshness, recipient coverage, policy readiness, packet test status, and missing critical categories. AI may explain the score but cannot calculate or alter it. Weight changes require a versioned decision, migration, test vectors, and disclosure.

## Family IQ gap analysis
A deterministic rules engine asks what a successor would need to operate the household. It generates category-specific gaps such as water shutoff location, school contact, pet medication, storage-unit access location, adviser identity, insurance carrier, document location, and packet recipient. AI may rephrase questions but cannot mark a gap resolved.

## Media and message integrity
Original uploads are immutable. Derivatives retain source hashes. Letters, videos, advice, photos, recipes, captions, recipient assignments, publication status, and release conditions are versioned. Synthetic content is labeled. No posthumous voice cloning or deepfake video exists in the initial product.

## Runtime flow
Request -> authentication -> tenant and household context -> authorization -> schema validation -> use case -> transaction -> outbox -> worker/provider -> evidence -> user-visible status.

Emergency flow: recipient request -> identity verification -> deterministic policy evaluation -> owner and verifier notifications -> challenge timer -> denial and takeover monitoring -> final policy evaluation -> packet manifest lock -> one-time encrypted release -> access audit -> expiry and revocation.

## Persistence and concurrency
Every tenant-owned mutable record has optimistic concurrency. Outbox and inbox tables provide exactly-once business effects over at-least-once delivery. Release uses transaction-scoped advisory locks plus idempotency keys. Packet manifests are content-addressed and immutable after release approval.

## Security boundaries
Browsers, recipients, helpers, uploads, QR codes, email links, provider webhooks, AI output, support tools, and release evidence are untrusted. Validate each boundary. Uploaded files remain quarantined until MIME, magic-byte, size, malware, and normalization gates pass.

## Architectural invariants
INV-01 Every household query requires tenant and household context.
INV-02 AI output cannot directly modify confirmed facts or release eligibility.
INV-03 Prohibited secrets cannot cross the AI boundary or appear in generated packets.
INV-04 Every packet is purpose-scoped, recipient-scoped, and versioned.
INV-05 No emergency release occurs without deterministic policy satisfaction and durable evidence.
INV-06 Death, incapacity, guardianship, ownership, or authority is never determined by AI.
INV-07 Ambiguous provider or verification outcome is never treated as success.
INV-08 Trusted helpers see only explicitly granted categories and actions.
INV-09 Original media, consent, release manifests, and audit events are immutable.
INV-10 Readiness scores derive only from confirmed, versioned rules and data.
INV-11 Recipient access is revocable, expiring, least-privilege, and fully audited.
INV-12 Deletion is tenant-scoped, retention-aware, and proven by purge evidence.
INV-13 Cache keys include tenant isolation, prompt version, data version, and consent state.
INV-14 A release notification or download link is not proof of recipient access; access is separately evidenced.
INV-15 No single uploaded document automatically authorizes release.

## Forbidden moves
Direct AI or provider calls from controllers; LLM-driven SQL; public-by-default packets; all-or-nothing family access; storing passwords, seed phrases, recovery codes, private keys, safe combinations, or full payment credentials; automatic acceptance of extraction; release based only on one death certificate; global support access; blind retry after ambiguous release; hidden score changes; posthumous voice cloning; face recognition; silent policy acceptance.

## How to add a feature
Update product behavior spec, vocabulary tables, threat model, privacy classification, authorization matrix, migration, tests, live-fire mapping, metrics, runbook, and release notes before implementation.

## How to add an integration
Add a port, provider adapter, exact configuration schema, read-only probe, contract test, sandbox live-fire proof, timeout and ambiguity policy, DLP review, subprocessor review, retention analysis, and fallback. Direct integration calls are forbidden.

## How to add a schema change
Use expand-migrate-backfill-verify-contract. Every destructive step has a backup/restore plan and production stop condition.

## Architecture review checklist
Confirm all invariants, tenant and packet isolation, deterministic release policy, no AI authority, immutable evidence, idempotency, safe ambiguous outcomes, accessible flows, retention, provider fallback, and real live-fire coverage.
