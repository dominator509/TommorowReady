import { createHmac, timingSafeEqual } from 'node:crypto';

export type PostalAddress = Readonly<{
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
}>;
export type VerifiedPostalAddress = PostalAddress &
  Readonly<{
    provider: 'lob' | 'postgrid';
    providerAddressId: string;
    verifiedAt: string;
  }>;
export type PhysicalMailService =
  'FIRST_CLASS' | 'CERTIFIED' | 'CERTIFIED_RETURN_RECEIPT' | 'REGISTERED';
export type PhysicalMailRequest = Readonly<{
  to: VerifiedPostalAddress;
  from: PostalAddress;
  pdf: Buffer;
  html: string;
  contentSha256: string;
  idempotencyKey: string;
  service: PhysicalMailService;
  description: string;
}>;
export type PhysicalMailOrder = Readonly<{
  provider: 'lob' | 'postgrid';
  providerOrderId: string;
  status: string;
  acceptedAt: string;
  trackingNumber?: string;
}>;
export type VerifiedPhysicalMailEvent = Readonly<{
  provider: 'lob' | 'postgrid';
  eventId: string;
  providerOrderId: string;
  type: string;
  status: string;
  occurredAt: string;
  trackingNumber?: string;
}>;

export class PhysicalMailError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable: boolean,
    public readonly outcomeAmbiguous: boolean,
  ) {
    super(message);
  }
}

export interface PhysicalMailProvider {
  readonly name: 'lob' | 'postgrid';
  verifyAddress(address: PostalAddress): Promise<VerifiedPostalAddress>;
  createLetter(request: PhysicalMailRequest): Promise<PhysicalMailOrder>;
  cancelLetter(providerOrderId: string): Promise<void>;
  getLetter(providerOrderId: string): Promise<PhysicalMailOrder>;
  verifyWebhook(
    headers: Readonly<Record<string, string | string[] | undefined>>,
    rawBody: Buffer,
    now?: Date,
  ): VerifiedPhysicalMailEvent;
}

export function configuredPhysicalMailProviders(
  environment: NodeJS.ProcessEnv = process.env,
): Readonly<Partial<Record<'lob' | 'postgrid', PhysicalMailProvider>>> {
  const providers: Partial<Record<'lob' | 'postgrid', PhysicalMailProvider>> = {};
  const lob = [environment.LOB_API_KEY, environment.LOB_WEBHOOK_SECRET];
  if (lob.some(Boolean) && !lob.every(Boolean)) throw new Error('LOB_CONFIGURATION_INCOMPLETE');
  if (lob.every(Boolean))
    providers.lob = new LobPhysicalMailProvider(
      environment.LOB_API_KEY!,
      environment.LOB_WEBHOOK_SECRET!,
    );

  const postgrid = [
    environment.POSTGRID_API_KEY,
    environment.POSTGRID_WEBHOOK_SECRET,
    environment.POSTGRID_RETURN_CONTACT_ID,
  ];
  if (postgrid.some(Boolean) && !postgrid.every(Boolean))
    throw new Error('POSTGRID_CONFIGURATION_INCOMPLETE');
  if (postgrid.every(Boolean))
    providers.postgrid = new PostGridPhysicalMailProvider(
      environment.POSTGRID_API_KEY!,
      environment.POSTGRID_WEBHOOK_SECRET!,
      environment.POSTGRID_RETURN_CONTACT_ID!,
    );
  return providers;
}

type Fetch = typeof fetch;

function requiredText(value: unknown, code: string): string {
  if (typeof value !== 'string' || !value.trim())
    throw new PhysicalMailError(
      code,
      'Physical mail provider returned an invalid response.',
      false,
      true,
    );
  return value;
}

function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function webhookPayload(rawBody: Buffer): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(rawBody.toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    return parsed as Record<string, unknown>;
  } catch {
    throw new PhysicalMailError(
      'PHYSICAL_MAIL_WEBHOOK_INVALID',
      'Physical mail webhook payload is invalid.',
      false,
      false,
    );
  }
}

async function providerResponse(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new PhysicalMailError(
      'PHYSICAL_MAIL_RESPONSE_INVALID',
      'Physical mail provider returned an invalid response.',
      false,
      response.ok,
    );
  }
  if (!response.ok) {
    const retryable = response.status === 429 || response.status >= 500;
    throw new PhysicalMailError(
      `PHYSICAL_MAIL_HTTP_${response.status}`,
      retryable
        ? 'Physical mail provider is temporarily unavailable.'
        : 'Physical mail provider rejected the request.',
      retryable,
      false,
    );
  }
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new PhysicalMailError(
      'PHYSICAL_MAIL_RESPONSE_INVALID',
      'Physical mail provider returned an invalid response.',
      false,
      true,
    );
  return body as Record<string, unknown>;
}

async function call(
  fetcher: Fetch,
  url: string,
  init: RequestInit,
  ambiguousOnTransportFailure: boolean,
): Promise<Record<string, unknown>> {
  try {
    return await providerResponse(
      await fetcher(url, { ...init, signal: AbortSignal.timeout(12_000) }),
    );
  } catch (error) {
    if (error instanceof PhysicalMailError) throw error;
    throw new PhysicalMailError(
      'PHYSICAL_MAIL_TRANSPORT_FAILED',
      'Physical mail provider could not be reached.',
      !ambiguousOnTransportFailure,
      ambiguousOnTransportFailure,
    );
  }
}

function hmacVerified(
  secret: string,
  timestamp: string,
  signature: string,
  rawBody: Buffer,
  now: Date,
): void {
  const numeric = Number(timestamp);
  const timestampMs = numeric > 1_000_000_000_000 ? numeric : numeric * 1_000;
  if (!Number.isFinite(timestampMs) || Math.abs(now.getTime() - timestampMs) > 300_000)
    throw new PhysicalMailError(
      'PHYSICAL_MAIL_WEBHOOK_REPLAYED',
      'Physical mail webhook timestamp is invalid.',
      false,
      false,
    );
  const expected = createHmac('sha256', secret)
    .update(timestamp)
    .update('.')
    .update(rawBody)
    .digest('hex');
  const left = Buffer.from(expected, 'hex');
  const right = Buffer.from(signature, 'hex');
  if (left.length !== right.length || !timingSafeEqual(left, right))
    throw new PhysicalMailError(
      'PHYSICAL_MAIL_WEBHOOK_SIGNATURE_INVALID',
      'Physical mail webhook authentication failed.',
      false,
      false,
    );
}

const lobAddress = (address: PostalAddress): Record<string, string> => ({
  name: address.name,
  address_line1: address.addressLine1,
  ...(address.addressLine2 ? { address_line2: address.addressLine2 } : {}),
  address_city: address.city,
  address_state: address.state,
  address_zip: address.postalCode,
  address_country: address.countryCode,
});

export class LobPhysicalMailProvider implements PhysicalMailProvider {
  readonly name = 'lob' as const;
  private readonly authorization: string;
  constructor(
    apiKey: string,
    private readonly webhookSecret: string,
    private readonly fetcher: Fetch = fetch,
    private readonly baseUrl = 'https://api.lob.com/v1',
  ) {
    if (!apiKey.trim()) throw new Error('LOB_API_KEY_REQUIRED');
    if (Buffer.byteLength(webhookSecret, 'utf8') < 32)
      throw new Error('LOB_WEBHOOK_SECRET_INVALID');
    this.authorization = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
  }

  private headers(): Record<string, string> {
    return {
      authorization: this.authorization,
      'content-type': 'application/json',
      'lob-version': '2024-01-01',
    };
  }

  async verifyAddress(address: PostalAddress): Promise<VerifiedPostalAddress> {
    const us = address.countryCode === 'US';
    const body = us
      ? {
          recipient: address.name,
          primary_line: address.addressLine1,
          secondary_line: address.addressLine2 ?? '',
          city: address.city,
          state: address.state,
          zip_code: address.postalCode,
        }
      : {
          recipient: address.name,
          primary_line: address.addressLine1,
          secondary_line: address.addressLine2 ?? '',
          city: address.city,
          state: address.state,
          postal_code: address.postalCode,
          country: address.countryCode,
        };
    const result = await call(
      this.fetcher,
      `${this.baseUrl}/${us ? 'us_verifications' : 'intl_verifications'}`,
      { method: 'POST', headers: this.headers(), body: JSON.stringify(body) },
      false,
    );
    const deliverability = requiredText(result.deliverability, 'ADDRESS_VERIFICATION_INVALID');
    if (!['deliverable', 'deliverable_unnecessary_unit'].includes(deliverability))
      throw new PhysicalMailError(
        'ADDRESS_NOT_DELIVERABLE',
        'The postal address could not be verified as deliverable.',
        false,
        false,
      );
    return {
      ...address,
      addressLine1: requiredText(result.primary_line, 'ADDRESS_VERIFICATION_INVALID'),
      ...(optionalText(result.secondary_line)
        ? { addressLine2: optionalText(result.secondary_line)! }
        : {}),
      provider: 'lob',
      providerAddressId: requiredText(result.id, 'ADDRESS_VERIFICATION_INVALID'),
      verifiedAt: new Date().toISOString(),
    };
  }

  async createLetter(request: PhysicalMailRequest): Promise<PhysicalMailOrder> {
    const extraService =
      request.service === 'FIRST_CLASS'
        ? undefined
        : request.service === 'CERTIFIED'
          ? 'certified'
          : request.service === 'CERTIFIED_RETURN_RECEIPT'
            ? 'certified_return_receipt'
            : 'registered';
    const result = await call(
      this.fetcher,
      `${this.baseUrl}/letters`,
      {
        method: 'POST',
        headers: { ...this.headers(), 'idempotency-key': request.idempotencyKey },
        body: JSON.stringify({
          description: request.description,
          to: lobAddress(request.to),
          from: lobAddress(request.from),
          file: request.html,
          color: false,
          double_sided: true,
          address_placement: 'insert_blank_page',
          mail_type: 'usps_first_class',
          ...(extraService ? { extra_service: extraService } : {}),
          metadata: { content_sha256: request.contentSha256 },
        }),
      },
      true,
    );
    return {
      provider: 'lob',
      providerOrderId: requiredText(result.id, 'PHYSICAL_MAIL_RESPONSE_INVALID'),
      status: optionalText(result.status) ?? 'created',
      acceptedAt: optionalText(result.date_created) ?? new Date().toISOString(),
      ...(optionalText(result.tracking_number)
        ? { trackingNumber: optionalText(result.tracking_number)! }
        : {}),
    };
  }

  async cancelLetter(providerOrderId: string): Promise<void> {
    await call(
      this.fetcher,
      `${this.baseUrl}/letters/${encodeURIComponent(providerOrderId)}`,
      { method: 'DELETE', headers: this.headers() },
      true,
    );
  }

  async getLetter(providerOrderId: string): Promise<PhysicalMailOrder> {
    const result = await call(
      this.fetcher,
      `${this.baseUrl}/letters/${encodeURIComponent(providerOrderId)}`,
      { method: 'GET', headers: this.headers() },
      false,
    );
    return {
      provider: 'lob',
      providerOrderId: requiredText(result.id, 'PHYSICAL_MAIL_RESPONSE_INVALID'),
      status: optionalText(result.status) ?? 'created',
      acceptedAt: optionalText(result.date_created) ?? new Date().toISOString(),
      ...(optionalText(result.tracking_number)
        ? { trackingNumber: optionalText(result.tracking_number)! }
        : {}),
    };
  }

  verifyWebhook(
    headers: Readonly<Record<string, string | string[] | undefined>>,
    rawBody: Buffer,
    now = new Date(),
  ): VerifiedPhysicalMailEvent {
    const timestamp = headers['lob-signature-timestamp'];
    const signature = headers['lob-signature'];
    if (typeof timestamp !== 'string' || typeof signature !== 'string')
      throw new PhysicalMailError(
        'PHYSICAL_MAIL_WEBHOOK_SIGNATURE_INVALID',
        'Physical mail webhook authentication failed.',
        false,
        false,
      );
    hmacVerified(this.webhookSecret, timestamp, signature, rawBody, now);
    const payload = webhookPayload(rawBody);
    const eventType = payload.event_type as Record<string, unknown> | undefined;
    const body = payload.body as Record<string, unknown> | undefined;
    return {
      provider: 'lob',
      eventId: requiredText(payload.id, 'PHYSICAL_MAIL_WEBHOOK_INVALID'),
      providerOrderId: requiredText(payload.reference_id, 'PHYSICAL_MAIL_WEBHOOK_INVALID'),
      type: requiredText(eventType?.id, 'PHYSICAL_MAIL_WEBHOOK_INVALID'),
      status:
        optionalText(body?.status) ?? requiredText(eventType?.id, 'PHYSICAL_MAIL_WEBHOOK_INVALID'),
      occurredAt: requiredText(payload.date_created, 'PHYSICAL_MAIL_WEBHOOK_INVALID'),
      ...(optionalText(body?.tracking_number)
        ? { trackingNumber: optionalText(body?.tracking_number)! }
        : {}),
    };
  }
}

const postGridContact = (address: PostalAddress): Record<string, unknown> => ({
  firstName: address.name,
  addressLine1: address.addressLine1,
  ...(address.addressLine2 ? { addressLine2: address.addressLine2 } : {}),
  city: address.city,
  provinceOrState: address.state,
  postalOrZip: address.postalCode,
  countryCode: address.countryCode,
  secret: true,
  skipVerification: false,
  forceVerifiedStatus: false,
});

export class PostGridPhysicalMailProvider implements PhysicalMailProvider {
  readonly name = 'postgrid' as const;
  constructor(
    private readonly apiKey: string,
    private readonly webhookSecret: string,
    private readonly returnContactId: string,
    private readonly fetcher: Fetch = fetch,
    private readonly baseUrl = 'https://api.postgrid.com/print-mail/v1',
  ) {
    if (!apiKey.trim()) throw new Error('POSTGRID_API_KEY_REQUIRED');
    if (Buffer.byteLength(webhookSecret, 'utf8') < 32)
      throw new Error('POSTGRID_WEBHOOK_SECRET_INVALID');
    if (!/^contact_[A-Za-z0-9]+$/.test(returnContactId))
      throw new Error('POSTGRID_RETURN_CONTACT_ID_INVALID');
  }

  private headers(): Record<string, string> {
    return { 'x-api-key': this.apiKey };
  }

  async verifyAddress(address: PostalAddress): Promise<VerifiedPostalAddress> {
    const result = await call(
      this.fetcher,
      `${this.baseUrl}/contacts`,
      {
        method: 'POST',
        headers: { ...this.headers(), 'content-type': 'application/json' },
        body: JSON.stringify(postGridContact(address)),
      },
      false,
    );
    const status = requiredText(result.addressStatus, 'ADDRESS_VERIFICATION_INVALID');
    if (!['verified', 'corrected'].includes(status))
      throw new PhysicalMailError(
        'ADDRESS_NOT_DELIVERABLE',
        'The postal address could not be verified as deliverable.',
        false,
        false,
      );
    return {
      name: optionalText(result.firstName) ?? address.name,
      addressLine1: requiredText(result.addressLine1, 'ADDRESS_VERIFICATION_INVALID'),
      ...(optionalText(result.addressLine2)
        ? { addressLine2: optionalText(result.addressLine2)! }
        : {}),
      city: optionalText(result.city) ?? address.city,
      state: optionalText(result.provinceOrState) ?? address.state,
      postalCode: optionalText(result.postalOrZip) ?? address.postalCode,
      countryCode: optionalText(result.countryCode) ?? address.countryCode,
      provider: 'postgrid',
      providerAddressId: requiredText(result.id, 'ADDRESS_VERIFICATION_INVALID'),
      verifiedAt: new Date().toISOString(),
    };
  }

  async createLetter(request: PhysicalMailRequest): Promise<PhysicalMailOrder> {
    const form = new FormData();
    form.set('to', request.to.providerAddressId);
    form.set('from', this.returnContactId);
    form.set(
      'pdf',
      new Blob([Uint8Array.from(request.pdf)], { type: 'application/pdf' }),
      'release.pdf',
    );
    form.set('addressPlacement', 'insert_blank_page');
    form.set('doubleSided', 'true');
    form.set('color', 'false');
    form.set('mailingClass', 'first_class');
    form.set('description', request.description);
    form.set('metadata[idempotencyKey]', request.idempotencyKey);
    form.set('metadata[contentSha256]', request.contentSha256);
    if (request.service !== 'FIRST_CLASS')
      form.set(
        'extraService',
        request.service === 'CERTIFIED'
          ? 'certified'
          : request.service === 'CERTIFIED_RETURN_RECEIPT'
            ? 'certified_return_receipt'
            : 'registered',
      );
    const result = await call(
      this.fetcher,
      `${this.baseUrl}/letters`,
      { method: 'POST', headers: this.headers(), body: form },
      true,
    );
    return {
      provider: 'postgrid',
      providerOrderId: requiredText(result.id, 'PHYSICAL_MAIL_RESPONSE_INVALID'),
      status: requiredText(result.status, 'PHYSICAL_MAIL_RESPONSE_INVALID'),
      acceptedAt: optionalText(result.sendDate) ?? new Date().toISOString(),
      ...(optionalText(result.trackingNumber)
        ? { trackingNumber: optionalText(result.trackingNumber)! }
        : {}),
    };
  }

  async cancelLetter(providerOrderId: string): Promise<void> {
    await call(
      this.fetcher,
      `${this.baseUrl}/letters/${encodeURIComponent(providerOrderId)}`,
      { method: 'DELETE', headers: this.headers() },
      true,
    );
  }

  async getLetter(providerOrderId: string): Promise<PhysicalMailOrder> {
    const result = await call(
      this.fetcher,
      `${this.baseUrl}/letters/${encodeURIComponent(providerOrderId)}`,
      { method: 'GET', headers: this.headers() },
      false,
    );
    return {
      provider: 'postgrid',
      providerOrderId: requiredText(result.id, 'PHYSICAL_MAIL_RESPONSE_INVALID'),
      status: requiredText(result.status, 'PHYSICAL_MAIL_RESPONSE_INVALID'),
      acceptedAt: optionalText(result.sendDate) ?? new Date().toISOString(),
      ...(optionalText(result.trackingNumber)
        ? { trackingNumber: optionalText(result.trackingNumber)! }
        : {}),
    };
  }

  verifyWebhook(
    headers: Readonly<Record<string, string | string[] | undefined>>,
    rawBody: Buffer,
    now = new Date(),
  ): VerifiedPhysicalMailEvent {
    const header = headers['postgrid-signature'];
    if (typeof header !== 'string')
      throw new PhysicalMailError(
        'PHYSICAL_MAIL_WEBHOOK_SIGNATURE_INVALID',
        'Physical mail webhook authentication failed.',
        false,
        false,
      );
    const values = Object.fromEntries(
      header.split(',').map((part) => {
        const [key, value] = part.trim().split('=', 2);
        return [key, value];
      }),
    );
    if (!values.t || !values.v1)
      throw new PhysicalMailError(
        'PHYSICAL_MAIL_WEBHOOK_SIGNATURE_INVALID',
        'Physical mail webhook authentication failed.',
        false,
        false,
      );
    hmacVerified(this.webhookSecret, values.t, values.v1, rawBody, now);
    const payload = webhookPayload(rawBody);
    const data = payload.data as Record<string, unknown> | undefined;
    return {
      provider: 'postgrid',
      eventId:
        optionalText(payload.id) ??
        `${values.t}:${requiredText(data?.id, 'PHYSICAL_MAIL_WEBHOOK_INVALID')}`,
      providerOrderId: requiredText(data?.id, 'PHYSICAL_MAIL_WEBHOOK_INVALID'),
      type: requiredText(payload.type, 'PHYSICAL_MAIL_WEBHOOK_INVALID'),
      status: requiredText(data?.status, 'PHYSICAL_MAIL_WEBHOOK_INVALID'),
      occurredAt: optionalText(payload.createdAt) ?? new Date(Number(values.t)).toISOString(),
      ...(optionalText(data?.trackingNumber)
        ? { trackingNumber: optionalText(data?.trackingNumber)! }
        : {}),
    };
  }
}
