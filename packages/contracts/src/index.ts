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
