import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  StripeBillingProvider,
  verifyStripeWebhook,
} from '../../packages/infrastructure/billing/src/index.js';

const secret = 'whsec_local_contract_secret_123456';
const raw = JSON.stringify({
  id: 'evt_contract',
  created: 1_700_000_000,
  type: 'customer.subscription.updated',
  data: {
    object: {
      id: 'sub_contract',
      customer: 'cus_contract',
      status: 'active',
      metadata: {
        tenantId: '009cbb07-81dd-49b0-bdbf-5585113a3f13',
        householdId: 'd7a1395d-f905-4cc4-beed-b57170be24de',
      },
    },
  },
});

describe('billing provider boundary', () => {
  it('authenticates exact webhook bytes and maps bounded fields', () => {
    const timestamp = 1_700_000_000;
    const signature = createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex');
    expect(
      verifyStripeWebhook(raw, `t=${timestamp},v1=${signature}`, secret, timestamp),
    ).toMatchObject({
      eventId: 'evt_contract',
      providerSubscriptionId: 'sub_contract',
      status: 'active',
    });
    expect(() =>
      verifyStripeWebhook(`${raw} `, `t=${timestamp},v1=${signature}`, secret, timestamp),
    ).toThrow('BILLING_WEBHOOK_SIGNATURE_INVALID');
  });

  it('constructs an idempotent tenant-bound checkout request', async () => {
    let request: RequestInit | undefined;
    const provider = new StripeBillingProvider(
      'sk_test_contract_key',
      'http://127.0.0.1:9998/v1',
      (async (_url, init) => {
        request = init;
        return Response.json({ id: 'cs_contract', url: 'https://checkout.example/session' });
      }) as typeof fetch,
    );
    await provider.createCheckout({
      tenantId: '009cbb07-81dd-49b0-bdbf-5585113a3f13',
      householdId: 'd7a1395d-f905-4cc4-beed-b57170be24de',
      priceId: 'price_contract',
      successUrl: 'https://app.example/success',
      cancelUrl: 'https://app.example/cancel',
      idempotencyKey: 'checkout-contract',
      signal: new AbortController().signal,
    });
    expect(request?.headers).toMatchObject({ 'idempotency-key': 'checkout-contract' });
    expect(String(request?.body)).toContain(
      'subscription_data%5Bmetadata%5D%5BtenantId%5D=009cbb07-81dd-49b0-bdbf-5585113a3f13',
    );
  });
});
