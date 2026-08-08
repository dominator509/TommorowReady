import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const stripeEvent = z.object({
  id: z.string().startsWith('evt_').max(255),
  created: z.number().int().nonnegative(),
  type: z.enum([
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.payment_failed',
  ]),
  data: z.object({
    object: z
      .object({
        id: z.string().max(255),
        subscription: z.string().max(255).nullable().optional(),
        status: z.string().max(80).optional(),
        customer: z.string().max(255),
        metadata: z.object({
          tenantId: z.string().uuid(),
          householdId: z.string().uuid(),
        }),
      })
      .passthrough(),
  }),
});

export type VerifiedBillingEvent = Readonly<{
  eventId: string;
  created: number;
  type: z.infer<typeof stripeEvent>['type'];
  providerSubscriptionId: string;
  providerCustomerId: string;
  tenantId: string;
  householdId: string;
  status: string;
}>;

export function verifyStripeWebhook(
  rawBody: string,
  signatureHeader: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): VerifiedBillingEvent {
  if (secret.length < 20) throw new Error('BILLING_WEBHOOK_SECRET_INVALID');
  const parts = signatureHeader.split(',').map((part) => part.split('=', 2));
  const timestamp = Number(parts.find(([key]) => key === 't')?.[1]);
  const signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => value ?? '');
  if (
    !Number.isInteger(timestamp) ||
    Math.abs(nowSeconds - timestamp) > 300 ||
    signatures.length === 0
  )
    throw new Error('BILLING_WEBHOOK_SIGNATURE_INVALID');
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  if (
    !signatures.some(
      (candidate) =>
        candidate.length === expected.length &&
        timingSafeEqual(Buffer.from(candidate), Buffer.from(expected)),
    )
  )
    throw new Error('BILLING_WEBHOOK_SIGNATURE_INVALID');
  const event = stripeEvent.parse(JSON.parse(rawBody));
  const object = event.data.object;
  return {
    eventId: event.id,
    created: event.created,
    type: event.type,
    providerSubscriptionId: object.subscription ?? object.id,
    providerCustomerId: object.customer,
    tenantId: object.metadata.tenantId,
    householdId: object.metadata.householdId,
    status:
      event.type === 'invoice.payment_failed'
        ? 'past_due'
        : event.type === 'customer.subscription.deleted'
          ? 'canceled'
          : (object.status ?? 'incomplete'),
  };
}

export class StripeBillingProvider {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = 'https://api.stripe.com/v1',
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    if (!/^sk_(?:test|live)_/.test(apiKey)) throw new Error('BILLING_API_KEY_INVALID');
    const url = new URL(baseUrl);
    if (url.protocol !== 'https:' && !['127.0.0.1', 'localhost'].includes(url.hostname))
      throw new Error('BILLING_BASE_URL_INSECURE');
  }

  async createCheckout(input: {
    tenantId: string;
    householdId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    idempotencyKey: string;
    signal: AbortSignal;
  }): Promise<Readonly<{ id: string; url: string }>> {
    const body = new URLSearchParams({
      mode: 'subscription',
      'line_items[0][price]': input.priceId,
      'line_items[0][quantity]': '1',
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      'subscription_data[metadata][tenantId]': input.tenantId,
      'subscription_data[metadata][householdId]': input.householdId,
    });
    const response = await this.fetchImpl(`${this.baseUrl}/checkout/sessions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/x-www-form-urlencoded',
        'idempotency-key': input.idempotencyKey,
      },
      body,
      signal: input.signal,
    });
    if (response.status === 429) throw new Error('BILLING_RATE_LIMITED');
    if (!response.ok) throw new Error(`BILLING_PROVIDER_${response.status}`);
    const payload = (await response.json()) as { id?: unknown; url?: unknown };
    if (typeof payload.id !== 'string' || typeof payload.url !== 'string')
      throw new Error('BILLING_PROVIDER_RESPONSE_INVALID');
    return { id: payload.id, url: payload.url };
  }
}
