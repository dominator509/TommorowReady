import { z } from 'zod';

export const sessionClaims = z
  .object({
    sub: z.string().uuid(),
    tenantId: z.string().uuid(),
    householdId: z.string().uuid().optional(),
    role: z.enum([
      'owner',
      'co-owner',
      'trusted-helper',
      'packet-recipient',
      'professional-viewer',
      'support-agent',
      'platform-administrator',
    ]),
    assurance: z.enum(['password', 'mfa', 'passkey']),
    actionGrants: z.array(z.string().min(1).max(120)).max(200),
    categoryGrants: z.array(z.string().min(1).max(120)).max(200),
    packetGrants: z.array(z.string().uuid()).max(500),
    purpose: z.string().trim().min(3).max(120),
    iss: z.literal('tomorrowready'),
    aud: z.literal('tomorrowready-api'),
    iat: z.number().int().nonnegative(),
    exp: z.number().int().positive(),
    jti: z.string().uuid(),
    customerApproved: z.boolean().optional(),
    reason: z.string().trim().min(3).max(500).optional(),
  })
  .strict();
export const householdInput = z.object({ name: z.string().trim().min(1).max(120) });
export const passwordSessionInput = z
  .object({
    tenantId: z.string().uuid(),
    email: z.email().max(320),
    password: z.string().min(12).max(256),
    totp: z
      .string()
      .regex(/^\d{6}$/)
      .optional(),
  })
  .strict();
export const passwordRecoveryRequestInput = z
  .object({ tenantId: z.string().uuid(), email: z.email().max(320) })
  .strict();
export const passwordRecoveryCompleteInput = z
  .object({
    tenantId: z.string().uuid(),
    email: z.email().max(320),
    token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    newPassword: z.string().min(12).max(256),
  })
  .strict();
export const passkeyAuthenticationOptionsInput = z
  .object({ tenantId: z.string().uuid(), email: z.email().max(320) })
  .strict();
export const passkeyCeremonyInput = z
  .object({
    flowId: z.string().uuid(),
    response: z.record(z.string(), z.unknown()),
  })
  .strict();
export const recordInput = z.object({
  kind: z.string().min(1).max(80),
  payload: z.record(z.string(), z.unknown()),
});
export const payloadInput = z.record(z.string(), z.unknown());
export const packetInput = z.object({
  purpose: z.string().min(3).max(200),
  recipientId: z.string().uuid(),
  itemIds: z.array(z.string().uuid()).min(1).max(500),
});
export const accessRequestInput = z
  .object({
    packetId: z.string().uuid(),
    recipientId: z.string().uuid(),
    purpose: z.string().trim().min(3).max(200),
  })
  .strict();
export const releaseTransitionInput = z
  .object({
    next: z.enum([
      'DRAFT',
      'ARMED',
      'REQUESTED',
      'VERIFYING',
      'CHALLENGE_ACTIVE',
      'APPROVED_FOR_RELEASE',
      'RELEASED',
      'DENIED',
      'EXPIRED',
      'CANCELLED',
      'MANUAL_REVIEW_REQUIRED',
    ]),
  })
  .strict();
export const postalAddressInput = z
  .object({
    recipientId: z.string().uuid(),
    name: z.string().trim().min(1).max(80),
    addressLine1: z.string().trim().min(1).max(100),
    addressLine2: z.string().trim().max(100).optional(),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().min(1).max(100),
    postalCode: z.string().trim().min(2).max(20),
    countryCode: z.string().regex(/^[A-Z]{2}$/),
    provider: z.enum(['lob', 'postgrid']),
  })
  .strict();
export const recipientVerificationRequestInput = z
  .object({ recipientId: z.string().uuid(), email: z.email().max(320) })
  .strict();
export const recipientVerificationCompleteInput = z
  .object({
    tenantId: z.string().uuid(),
    householdId: z.string().uuid(),
    profileId: z.string().uuid(),
    token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  })
  .strict();
export const continuityMonitorInput = z
  .object({
    packetId: z.string().uuid(),
    recipientId: z.string().uuid(),
    checkInIntervalDays: z.number().int().min(1).max(365),
    reminderOffsetsHours: z.array(z.number().int().min(0).max(719)).min(1).max(12),
    gracePeriodHours: z.number().int().min(24).max(720),
    releaseDelayHours: z.number().int().min(0).max(168).default(24),
    digitalDelivery: z.boolean(),
    physicalMail: z
      .object({
        addressId: z.string().uuid(),
        provider: z.enum(['lob', 'postgrid']),
        mode: z.enum(['SECURE_ACCESS_LETTER', 'SELECTED_INSTRUCTIONS', 'FULL_ELIGIBLE_PACKET']),
        service: z.enum(['FIRST_CLASS', 'CERTIFIED', 'CERTIFIED_RETURN_RECEIPT', 'REGISTERED']),
      })
      .strict()
      .optional(),
  })
  .strict();
export const continuityMonitorActionInput = z
  .object({
    action: z.enum(['TEST', 'ARM', 'CHECK_IN', 'SNOOZE', 'CANCEL', 'DENY']),
    snoozeHours: z.number().int().min(1).max(168).optional(),
  })
  .strict();
export const releaseRedemptionInput = z
  .object({
    tenantId: z.string().uuid(),
    householdId: z.string().uuid(),
    tokenId: z.string().uuid(),
    token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  })
  .strict();
export type ErrorEnvelope = Readonly<{
  code: string;
  message: string;
  request_id: string;
  retryable: boolean;
  field_errors?: Readonly<Record<string, string>>;
}>;
export function errorEnvelope(
  code: string,
  message: string,
  requestId: string,
  retryable = false,
): ErrorEnvelope {
  return { code, message, request_id: requestId, retryable };
}
