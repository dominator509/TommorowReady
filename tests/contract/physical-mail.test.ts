import { createHmac } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import {
  configuredPhysicalMailProviders,
  LobPhysicalMailProvider,
  PhysicalMailError,
  PostGridPhysicalMailProvider,
  type PostalAddress,
} from '../../packages/infrastructure/physical-mail/src/index.js';

const address: PostalAddress = {
  name: 'Recipient Example',
  addressLine1: '210 King St',
  addressLine2: 'Suite 6100',
  city: 'San Francisco',
  state: 'CA',
  postalCode: '94107',
  countryCode: 'US',
};

const servers: Array<ReturnType<typeof createServer>> = [];
afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map((server) => new Promise<void>((resolve) => server.close(() => resolve()))),
  );
});

async function harness(
  handler: (request: IncomingMessage, response: ServerResponse, body: Buffer) => void,
): Promise<string> {
  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => handler(request, response, Buffer.concat(chunks)));
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const location = server.address();
  if (!location || typeof location === 'string') throw new Error('HARNESS_ADDRESS_INVALID');
  return `http://127.0.0.1:${location.port}`;
}

describe('physical mail provider contracts', () => {
  it('fails closed on partial provider configuration and leaves absent providers disabled', () => {
    expect(configuredPhysicalMailProviders({})).toEqual({});
    expect(() => configuredPhysicalMailProviders({ LOB_API_KEY: 'partial' })).toThrow(
      'LOB_CONFIGURATION_INCOMPLETE',
    );
    expect(() =>
      configuredPhysicalMailProviders({
        POSTGRID_API_KEY: 'partial',
        POSTGRID_WEBHOOK_SECRET: 'webhook-secret-with-at-least-32-bytes',
      }),
    ).toThrow('POSTGRID_CONFIGURATION_INCOMPLETE');
  });

  it('constructs Lob verification and idempotent letter requests against a real HTTP harness', async () => {
    const seen: Array<{ url: string; headers: IncomingMessage['headers']; body: string }> = [];
    const base = await harness((request, response, body) => {
      seen.push({ url: request.url ?? '', headers: request.headers, body: body.toString('utf8') });
      response.setHeader('content-type', 'application/json');
      if (request.url === '/us_verifications')
        response.end(
          JSON.stringify({
            id: 'us_ver_contract',
            deliverability: 'deliverable',
            primary_line: '210 KING ST',
            secondary_line: 'STE 6100',
          }),
        );
      else
        response.end(
          JSON.stringify({
            id: 'ltr_contract',
            status: 'rendered',
            date_created: '2026-08-08T12:00:00.000Z',
          }),
        );
    });
    const provider = new LobPhysicalMailProvider(
      'test_contract_key',
      'webhook-secret-with-at-least-32-bytes',
      fetch,
      base,
    );
    const verified = await provider.verifyAddress(address);
    const order = await provider.createLetter({
      to: verified,
      from: address,
      pdf: Buffer.from('%PDF-1.4\n%%EOF\n'),
      html: '<html><body>Secure access instructions</body></html>',
      contentSha256: 'a'.repeat(64),
      idempotencyKey: 'monitor:contract:release',
      service: 'CERTIFIED_RETURN_RECEIPT',
      description: 'TomorrowReady secure access letter',
    });
    expect(order).toMatchObject({ provider: 'lob', providerOrderId: 'ltr_contract' });
    expect(seen[0]).toMatchObject({ url: '/us_verifications' });
    expect(seen[1]?.headers['idempotency-key']).toBe('monitor:contract:release');
    expect(JSON.parse(seen[1]!.body)).toMatchObject({
      extra_service: 'certified_return_receipt',
      file: '<html><body>Secure access instructions</body></html>',
      metadata: { content_sha256: 'a'.repeat(64) },
    });
  });

  it('constructs PostGrid secret-contact and exact PDF multipart requests', async () => {
    const seen: Array<{ url: string; body: string }> = [];
    const base = await harness((request, response, body) => {
      seen.push({ url: request.url ?? '', body: body.toString('latin1') });
      response.setHeader('content-type', 'application/json');
      if (request.url === '/contacts')
        response.end(
          JSON.stringify({
            id: 'contact_verified',
            addressStatus: 'verified',
            firstName: address.name,
            addressLine1: address.addressLine1,
            addressLine2: address.addressLine2,
            city: address.city,
            provinceOrState: address.state,
            postalOrZip: address.postalCode,
            countryCode: address.countryCode,
          }),
        );
      else
        response.end(
          JSON.stringify({
            id: 'letter_contract',
            status: 'ready',
            sendDate: '2026-08-08T12:00:00.000Z',
          }),
        );
    });
    const provider = new PostGridPhysicalMailProvider(
      'test_contract_key',
      'webhook-secret-with-at-least-32-bytes',
      'contact_return',
      fetch,
      base,
    );
    const verified = await provider.verifyAddress(address);
    const pdf = Buffer.from('%PDF-1.4\ncontract-body\n%%EOF\n');
    const order = await provider.createLetter({
      to: verified,
      from: address,
      pdf,
      html: '<html>unused by PostGrid</html>',
      contentSha256: 'b'.repeat(64),
      idempotencyKey: 'monitor:contract:release',
      service: 'CERTIFIED',
      description: 'TomorrowReady selected instructions',
    });
    expect(order).toMatchObject({ provider: 'postgrid', providerOrderId: 'letter_contract' });
    expect(JSON.parse(seen[0]!.body)).toMatchObject({ secret: true, forceVerifiedStatus: false });
    expect(seen[1]!.body).toContain('contract-body');
    expect(seen[1]!.body).toContain('metadata[idempotencyKey]');
    expect(seen[1]!.body).toContain('monitor:contract:release');
  });

  it('verifies provider webhooks over the exact raw body and rejects replay or tampering', () => {
    const secret = 'webhook-secret-with-at-least-32-bytes';
    const now = new Date('2026-08-08T12:00:00.000Z');
    const lob = new LobPhysicalMailProvider('test_contract_key', secret);
    const body = Buffer.from(
      JSON.stringify({
        id: 'evt_contract',
        reference_id: 'ltr_contract',
        date_created: now.toISOString(),
        event_type: { id: 'letter.mailed' },
        body: { status: 'mailed', tracking_number: 'tracking-contract' },
      }),
    );
    const timestamp = String(now.getTime() / 1_000);
    const signature = createHmac('sha256', secret)
      .update(`${timestamp}.`)
      .update(body)
      .digest('hex');
    expect(
      lob.verifyWebhook(
        { 'lob-signature-timestamp': timestamp, 'lob-signature': signature },
        body,
        now,
      ),
    ).toMatchObject({ eventId: 'evt_contract', status: 'mailed' });
    expect(() =>
      lob.verifyWebhook(
        { 'lob-signature-timestamp': timestamp, 'lob-signature': signature },
        Buffer.concat([body, Buffer.from(' ')]),
        now,
      ),
    ).toThrow(PhysicalMailError);
    expect(() =>
      lob.verifyWebhook(
        { 'lob-signature-timestamp': timestamp, 'lob-signature': signature },
        body,
        new Date(now.getTime() + 301_000),
      ),
    ).toThrow('timestamp is invalid');

    const postgrid = new PostGridPhysicalMailProvider(
      'test_contract_key',
      secret,
      'contact_return',
    );
    const postgridBody = Buffer.from(
      JSON.stringify({
        id: 'evt_postgrid_contract',
        type: 'letter.updated',
        data: { id: 'letter_contract', status: 'completed', trackingNumber: 'tracking-contract' },
      }),
    );
    const postgridSignature = createHmac('sha256', secret)
      .update(`${timestamp}.`)
      .update(postgridBody)
      .digest('hex');
    expect(
      postgrid.verifyWebhook(
        { 'postgrid-signature': `t=${timestamp},v1=${postgridSignature}` },
        postgridBody,
        now,
      ),
    ).toMatchObject({
      provider: 'postgrid',
      eventId: 'evt_postgrid_contract',
      providerOrderId: 'letter_contract',
      status: 'completed',
    });
  });
});
