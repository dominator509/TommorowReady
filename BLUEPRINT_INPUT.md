# Filled 6LAYER Input: TomorrowReady

## Project Name
TomorrowReady

## Project Description
TomorrowReady is a standalone, multi-tenant family continuity SaaS that helps a parent or household create a verified, private, compartmentalized operating manual for the people who would need to step in after death, incapacity, hospitalization, disappearance, deployment, evacuation, or another serious disruption. In one guided session, customers can inventory accounts and assets without storing prohibited login secrets, identify insurance and professional contacts, document storage units and physical locations, create child, pet, home, and business continuity instructions, preserve funeral wishes, letters, videos, advice, photographs, and family recipes, and prepare recipient-specific emergency packets. The product is not an estate-planning law firm, password manager, financial institution, emergency service, or autonomous executor.

## Product Goal
Make a household understandable and operable to the right people at the right time, without exposing the entire family archive to every recipient or allowing AI, a helper, or the platform to release sensitive information without verified authority and auditable controls.

## Target Users
- Parents and guardians who worry what their children would need if they disappeared tomorrow.
- Couples and single parents building a family continuity plan.
- Military members, first responders, frequent travelers, and people in higher-risk occupations.
- Caregivers and adult children helping a household prepare with permission.
- Families with pets, dependents, rental property, storage units, small businesses, or complex household operations.
- Trusted professionals invited with narrow, time-limited access.

## Core User Outcomes
1. Create a private household and complete a one-afternoon guided TomorrowReady plan.
2. Add children, dependents, pets, guardians, caregivers, advisers, friends, and emergency contacts with relationship and authority metadata.
3. Inventory financial accounts, insurance, assets, debts, storage units, property, digital services, and physical document locations without exposing prohibited secrets to AI.
4. Build child-care, pet-care, home-operation, medical-information, funeral-wish, and business-continuity playbooks.
5. Record letters, videos, advice, photographs, recipes, and personal messages for named recipients.
6. Generate a Family Readiness Score and a Family IQ gap analysis based only on verified missing information and deterministic rules.
7. Create compartmentalized packets for childcare, pets, medical support, household operation, financial contacts, executor preparation, and personal messages.
8. Invite a trusted helper with least-privilege, category-specific, time-bounded access.
9. Configure a delayed emergency-access policy with owner notification, challenge period, secondary verification, denial, and auditable release.
10. Request emergency access and release only the authorized packet after all policy conditions are satisfied.
11. Export a complete encrypted archive and printable family continuity binder containing verified facts, provenance, packet definitions, and review dates.
12. Exercise privacy access, correction, export, consent withdrawal, recipient revocation, and deletion rights without corrupting required audit evidence.
13. Complete an annual readiness review that detects stale contacts, outdated locations, missing packet recipients, and unreviewed instructions.
14. Recover safely from provider, queue, storage, or notification failure without unauthorized release, duplicate messages, or loss of authoritative records.

## Existing Repository Status
Greenfield.

## Preferred Tech Stack
Frontend: Next.js 16, React, TypeScript, Tailwind CSS, Radix primitives, React Hook Form, Zod, TanStack Query.
Backend: TypeScript modular monolith using Fastify with background workers.
Database: PostgreSQL 17 with row-level security; pgvector only for approved, non-secret retrieval.
Authentication: Passkeys preferred; email/password fallback; TOTP MFA; step-up authentication for packet release and policy changes.
Hosting / Deployment: Cloudflare DNS/CDN/WAF, containerized API and workers, managed PostgreSQL, managed Valkey, private S3-compatible object storage.
Testing: Vitest, property tests for release state machines, real PostgreSQL integration tests, Playwright E2E, axe accessibility, k6 performance, security and privacy test suites.
Package Manager: pnpm pinned by Corepack.
CI/CD: GitHub Actions with manual production environment approval.
Observability: OpenTelemetry, structured JSON logs, Sentry-compatible error sink, Prometheus-compatible metrics, privacy-safe audit dashboards.

## External Services, APIs, and Credentials Already Known
PostgreSQL, Valkey, private S3-compatible storage, optional DeepSeek API, transactional email, optional SMS, optional Stripe, malware scanning, optional transcription and video processing providers, optional print fulfillment, and production KMS. All services require provider adapters and fail-closed readiness states.

## Agent Platforms Expected To Run This Pack
Codex, Claude Code, Hermes, OpenClaw, and any terminal agent able to read files, edit files, and run commands.

## Auto-Deploy Authorization
No. The run ends at a verified, tagged, ship-ready artifact and an exact manual deployment command.

## Business Constraints
Low initial hosting cost; support at least 1,000 household profiles; modular scaling; consumer-grade trust; one-afternoon onboarding; concierge-assisted onboarding option; recurring annual review subscription; no advertising; no sale of personal data; no training on customer content.

## Technical Constraints
Modular monolith first; provider abstraction; deterministic release state machines; idempotent jobs; append-only audit and evidence; immutable originals; no passwords, recovery codes, seed phrases, private keys, full SSNs, full payment cards, or safe combinations sent to an LLM; target greater than 97 percent cache hits on cache-eligible repeated AI prefixes without irrelevant padding.

## Security / Compliance Constraints
Private by default; tenant isolation; least privilege; verified emergency-release authority; step-up authentication; challenge periods; anti-coercion and account-takeover controls; application-level encryption for restricted fields; immutable audit evidence; safe upload pipeline; explicit recording and AI consent; minor-data safeguards; state privacy rights; vendor risk assessment; incident response; retention enforcement; counsel review before production.

## Performance Requirements
P95 ordinary API reads under 350 ms and writes under 750 ms at 50 concurrent users excluding external providers; dashboard first content under 2.5 seconds on broadband; resumable uploads and background jobs; initial deployment supports 1,000 household profiles; workers scale horizontally; packet generation under 90 seconds for the 95th percentile household archive excluding video transcode.

## Accessibility Requirements
WCAG 2.2 AA target; full keyboard operation; 200 percent zoom; screen-reader labels; strong contrast; large touch targets; plain language; no color-only meaning; reduced motion; printable instructions; optional guided and helper-assisted modes.

## Data / Privacy Requirements
Purpose limitation; data minimization; private-by-default packets; granular recipient permissions; no data sale; no behavioral advertising; no model training on customer content; separate consent for external AI; prohibited-secret scanning; data-access, correction, export, deletion, and consent-withdrawal workflows; subprocessor register; retention schedule; customer-approved time-limited support access.

## Integrations
Email, optional SMS, private object storage, DeepSeek through an AI Policy Gateway, billing, optional transcription, optional print fulfillment, optional calendar reminders, malware scanning, and production KMS. No direct bank login, password-manager import, social scraping, or automatic legal filing in the initial release.

## Non-Goals
Legal, tax, medical, guardianship, probate, or financial advice; execution of a will; determining legal capacity; password management; storing authentication secrets; autonomous account closure or asset transfer; public memorial pages; face recognition; posthumous voice cloning; automatic death determination; emergency dispatch; background investigations; data brokerage; advertising profiles; release based solely on an uploaded death certificate or an AI decision.

## Timeline / Milestones
Milestone-based graph. Production release occurs only after all engineering gates, live-fire proofs, legal review, vendor review, security evidence, insurance evidence, and manual deployment authorization are complete.

## Deployment Target
Containerized web, API, worker, and report-renderer services with managed PostgreSQL and Valkey, private S3-compatible object storage, CDN/WAF, KMS, transactional email, and manual production deployment.

## Runtime Budgets
Default six attempts per milestone; 30 readiness probes at two-second intervals; ordinary graph nodes bounded to one workday of autonomous execution; packet generation and media workflows have explicit queue and timeout budgets.

## Special Instructions
TomorrowReady is a standalone product and repository. Emergency release is never all-or-nothing. Every packet has an explicit recipient, scope, purpose, challenge period, release policy, and revocation state. The platform never stores or sends prohibited login secrets to AI. AI may organize, explain, draft, and identify gaps, but cannot determine death, incapacity, guardianship, ownership, legal authority, or release eligibility. Every generated factual statement is linked to confirmed evidence or labeled as an unverified suggestion.
