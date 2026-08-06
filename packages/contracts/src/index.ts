import { z } from 'zod';

export const contextHeaders = z.object({
  'x-tenant-id': z.string().uuid(),
  'x-household-id': z.string().uuid().optional(),
  'x-actor-id': z.string().uuid(),
  'x-purpose': z.string().min(3).max(120),
});
export const householdInput = z.object({ name: z.string().trim().min(1).max(120) });
export const recordInput = z.object({
  kind: z.string().min(1).max(80),
  payload: z.record(z.string(), z.unknown()),
});
export const packetInput = z.object({
  purpose: z.string().min(3).max(200),
  recipientId: z.string().uuid(),
  itemIds: z.array(z.string().uuid()).min(1).max(500),
});
export const releaseTransitionInput = z.object({
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
  context: z.object({
    recipientVerified: z.boolean(),
    packetScopeMatches: z.boolean(),
    challengeEndsAt: z.iso.datetime(),
    now: z.iso.datetime(),
    ownerDenied: z.boolean(),
    takeoverSignal: z.boolean(),
    verificationSatisfied: z.boolean(),
    providerAmbiguous: z.boolean(),
  }),
});
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
