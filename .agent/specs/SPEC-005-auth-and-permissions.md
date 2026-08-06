# SPEC-005 Authentication and Permissions

Roles are Owner, CoOwner, TrustedHelper, PacketRecipient, ProfessionalViewer, SupportAgent, and PlatformAdministrator. Deny by default. Roles do not grant content access without household, category, action, purpose, and time scope.

Passkeys are preferred; password fallback and TOTP MFA are supported. Step-up authentication is required for emergency-policy changes, recipient changes, full exports, restricted grants, release approval, and deletion.

Trusted helpers cannot self-expand grants. Packet recipients cannot enumerate household resources. Support access requires customer approval, reason, expiry, and full audit. Platform administration cannot read household content by default.

Permission tests enumerate every role, category, action, packet scope, expiry, revocation, and cross-tenant case.
