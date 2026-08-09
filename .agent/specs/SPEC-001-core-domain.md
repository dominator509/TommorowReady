# SPEC-001 Core Domain

## Locked entities
Tenant, Household, Person, Dependent, ChildProfile, Pet, Relationship, Membership, TrustedHelperGrant, ProfessionalContact, EmergencyContact, AccountLocator, AssetRecord, DebtRecord, InsurancePolicyRecord, PropertyRecord, StorageUnitRecord, DocumentLocation, SourceDocument, ExtractedCandidate, ConfirmedFact, HomePlaybook, ChildcarePlaybook, PetCarePlaybook, MedicalInformationPacket, FuneralWish, BusinessContinuityPlaybook, Letter, VideoMessage, AdviceItem, PhotoAsset, FamilyRecipe, EvidenceReference, ReadinessRuleVersion, ReadinessResult, FamilyIQGap, PacketDefinition, PacketManifest, PacketRecipient, EmergencyPolicy, AccessRequest, VerificationEvidence, Challenge, Denial, ReleaseAuthorization, ReleasedPacket, ConsentRecord, AnnualReview, PrivacyRequest, Export, AuditEvent, Subscription, ContinuityMonitor, RecipientDeliveryProfile, RecipientPostalAddress, ReleaseDeliveryToken, ReleaseArtifact, PhysicalMailOrder.

## Locked status vocabulary
Candidate facts: `EXTRACTED`, `CONFLICTED`, `CONFIRMED`, `REJECTED`, `STALE`.
Packets: `DRAFT`, `READY`, `ARMED`, `SUPERSEDED`, `REVOKED`.
Emergency requests: `REQUESTED`, `VERIFYING`, `CHALLENGE_ACTIVE`, `APPROVED_FOR_RELEASE`, `RELEASED`, `DENIED`, `EXPIRED`, `CANCELLED`, `MANUAL_REVIEW_REQUIRED`.
Media: `QUARANTINED`, `PROCESSING`, `READY_FOR_REVIEW`, `APPROVED`, `REJECTED`, `DELETED`.
Continuity monitors: `DISABLED`, `ARMED`, `CHECK_IN_DUE`, `REMINDERS_ACTIVE`, `GRACE_PERIOD`, `RELEASE_PENDING`, `AUTOMATICALLY_RELEASED`, `SNOOZED`, `CANCELLED`, `OWNER_DENIED`, `SECURITY_LOCKED`, `DELIVERY_FAILED`.

## Core invariants
Use INV-01 through INV-15 from ARCHITECTURE.md. No unconfirmed extracted fact resolves a gap or enters a release packet. Every packet manifest is immutable after approval. Every release is recipient- and packet-scoped. AI cannot change domain authority.

## Acceptance
Unit and property tests exercise state machines, readiness rules, grants, packet isolation, challenge timing, denial, expiry, ambiguity, idempotency, and deletion without infrastructure leakage.
