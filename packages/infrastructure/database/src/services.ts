import { createHash, randomUUID } from 'node:crypto';
import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { Redis } from 'ioredis';
import nodemailer from 'nodemailer';

export class RealQueue {
  private readonly client: Redis;
  constructor(url: string) {
    this.client = new Redis(url, { maxRetriesPerRequest: 2, connectTimeout: 5_000 });
  }
  async roundTrip(value: string): Promise<string | null> {
    const key = `tomorrowready:probe:${randomUUID()}`;
    await this.client.set(key, value, 'EX', 30);
    const result = await this.client.get(key);
    await this.client.del(key);
    return result;
  }
  async close(): Promise<void> {
    await this.client.quit();
  }
}

export class RedisAuthRateLimiter {
  private readonly client: Redis;
  constructor(
    url: string,
    private readonly maximumAttempts = 5,
    private readonly windowSeconds = 900,
  ) {
    this.client = new Redis(url, { maxRetriesPerRequest: 1, connectTimeout: 3_000 });
  }

  async consume(tenantId: string, email: string): Promise<boolean> {
    const key = `tomorrowready:auth-attempts:${createHash('sha256')
      .update(`${tenantId}:${email.trim().toLowerCase()}`)
      .digest('hex')}`;
    const script = `
      local count = redis.call('INCR', KEYS[1])
      if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
      return count
    `;
    const count = Number(await this.client.eval(script, 1, key, String(this.windowSeconds)));
    return count <= this.maximumAttempts;
  }

  async reset(tenantId: string, email: string): Promise<void> {
    const key = `tomorrowready:auth-attempts:${createHash('sha256')
      .update(`${tenantId}:${email.trim().toLowerCase()}`)
      .digest('hex')}`;
    await this.client.del(key);
  }

  async close(): Promise<void> {
    await this.client.quit();
  }
}

export class RedisSessionRevocationStore {
  private readonly client: Redis;
  constructor(url: string) {
    this.client = new Redis(url, { maxRetriesPerRequest: 1, connectTimeout: 3_000 });
  }
  async isRevoked(jti: string): Promise<boolean> {
    return (await this.client.exists(`auth:revoked:${jti}`)) === 1;
  }
  async revoke(jti: string, expiresAt: number): Promise<void> {
    const ttl = Math.max(1, expiresAt - Date.now());
    await this.client.set(`auth:revoked:${jti}`, '1', 'PX', ttl, 'NX');
  }
  async close(): Promise<void> {
    await this.client.quit();
  }
}

export class RedisPasskeyChallengeStore {
  private readonly client: Redis;
  constructor(url: string) {
    this.client = new Redis(url, { maxRetriesPerRequest: 1, connectTimeout: 3_000 });
  }
  async put(flowId: string, value: Readonly<Record<string, unknown>>): Promise<void> {
    const result = await this.client.set(
      `tomorrowready:passkey:${flowId}`,
      JSON.stringify(value),
      'EX',
      300,
      'NX',
    );
    if (result !== 'OK') throw new Error('PASSKEY_FLOW_COLLISION');
  }
  async take(flowId: string): Promise<Readonly<Record<string, unknown>> | null> {
    const value = await this.client.getdel(`tomorrowready:passkey:${flowId}`);
    return value ? (JSON.parse(value) as Readonly<Record<string, unknown>>) : null;
  }
  async close(): Promise<void> {
    await this.client.quit();
  }
}

export type DurableJob = Readonly<{
  id: string;
  tenantId: string;
  householdId: string;
  type: 'packet' | 'notification' | 'retention' | 'export' | 'purge';
  idempotencyKey: string;
}>;

export type ClaimedDurableJob = Readonly<{
  streamId: string;
  job: DurableJob;
  attempt: number;
}>;

function assertDurableJob(value: unknown): asserts value is DurableJob {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const types = new Set(['packet', 'notification', 'retention', 'export', 'purge']);
  if (
    !value ||
    typeof value !== 'object' ||
    !('id' in value) ||
    typeof value.id !== 'string' ||
    !uuid.test(value.id) ||
    !('tenantId' in value) ||
    typeof value.tenantId !== 'string' ||
    !uuid.test(value.tenantId) ||
    !('householdId' in value) ||
    typeof value.householdId !== 'string' ||
    !uuid.test(value.householdId) ||
    !('type' in value) ||
    typeof value.type !== 'string' ||
    !types.has(value.type) ||
    !('idempotencyKey' in value) ||
    typeof value.idempotencyKey !== 'string' ||
    value.idempotencyKey.length < 1 ||
    value.idempotencyKey.length > 200
  )
    throw new Error('QUEUE_JOB_INVALID');
}

export class RealJobQueue {
  private readonly client: Redis;
  private readonly stream = 'tomorrowready:jobs:v1';
  private readonly group = 'tomorrowready-workers-v1';
  private readonly attempts = 'tomorrowready:job-attempts:v1';
  private readonly deadLetters = 'tomorrowready:jobs-dead-letter:v1';

  constructor(url: string) {
    this.client = new Redis(url, { maxRetriesPerRequest: 2, connectTimeout: 5_000 });
  }

  async ready(): Promise<void> {
    try {
      await this.client.xgroup('CREATE', this.stream, this.group, '0', 'MKSTREAM');
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('BUSYGROUP')) throw error;
    }
  }

  async enqueue(job: DurableJob): Promise<Readonly<{ enqueued: boolean; streamId: string }>> {
    assertDurableJob(job);
    await this.ready();
    const marker = `tomorrowready:job-idempotency:${createHash('sha256')
      .update(`${job.tenantId}:${job.idempotencyKey}`)
      .digest('hex')}`;
    const script = `
      local existing = redis.call('GET', KEYS[1])
      if existing then return {0, existing} end
      local stream_id = redis.call('XADD', KEYS[2], '*', 'job', ARGV[1])
      redis.call('SET', KEYS[1], stream_id, 'EX', ARGV[2], 'NX')
      return {1, stream_id}
    `;
    const result = (await this.client.eval(
      script,
      2,
      marker,
      this.stream,
      JSON.stringify(job),
      '604800',
    )) as [number, string];
    return { enqueued: result[0] === 1, streamId: result[1] };
  }

  async claim(consumer: string, blockMilliseconds = 100): Promise<ClaimedDurableJob | null> {
    await this.ready();
    const result = (await this.client.xreadgroup(
      'GROUP',
      this.group,
      consumer,
      'COUNT',
      1,
      'BLOCK',
      blockMilliseconds,
      'STREAMS',
      this.stream,
      '>',
    )) as unknown as Array<[string, Array<[string, string[]]>]> | null;
    return this.parseClaim(result?.[0]?.[1]?.[0]);
  }

  async reclaimStale(
    consumer: string,
    minimumIdleMilliseconds: number,
  ): Promise<ClaimedDurableJob | null> {
    await this.ready();
    const result = (await this.client.xautoclaim(
      this.stream,
      this.group,
      consumer,
      minimumIdleMilliseconds,
      '0-0',
      'COUNT',
      1,
    )) as unknown as [string, Array<[string, string[]]>, string[]];
    return this.parseClaim(result[1]?.[0]);
  }

  async fail(
    claimed: ClaimedDurableJob,
    errorCode: string,
    maximumAttempts = 5,
  ): Promise<Readonly<{ deadLettered: boolean }>> {
    if (!/^[A-Z0-9_]{3,120}$/.test(errorCode)) throw new Error('QUEUE_ERROR_CODE_INVALID');
    if (claimed.attempt < maximumAttempts) return { deadLettered: false };
    await this.client
      .multi()
      .xadd(
        this.deadLetters,
        '*',
        'job',
        JSON.stringify(claimed.job),
        'sourceStreamId',
        claimed.streamId,
        'attempt',
        String(claimed.attempt),
        'errorCode',
        errorCode,
      )
      .xack(this.stream, this.group, claimed.streamId)
      .exec();
    return { deadLettered: true };
  }

  async deadLetterLength(): Promise<number> {
    return this.client.xlen(this.deadLetters);
  }

  private async parseClaim(
    entry: [string, string[]] | undefined,
  ): Promise<ClaimedDurableJob | null> {
    if (!entry) return null;
    const [streamId, fields] = entry;
    const jobIndex = fields.indexOf('job');
    const encodedJob = jobIndex < 0 ? undefined : fields[jobIndex + 1];
    if (!encodedJob) throw new Error('QUEUE_JOB_INVALID');
    const job: unknown = JSON.parse(encodedJob);
    assertDurableJob(job);
    const attempt = await this.client.hincrby(this.attempts, streamId, 1);
    return { streamId, job, attempt };
  }

  async acknowledge(streamId: string): Promise<void> {
    const acknowledged = await this.client.xack(this.stream, this.group, streamId);
    if (acknowledged !== 1) throw new Error('QUEUE_ACKNOWLEDGEMENT_FAILED');
  }

  async close(): Promise<void> {
    await this.client.quit();
  }
}

export class RealObjectStorage {
  private readonly client: S3Client;
  constructor(
    private readonly bucket: string,
    endpoint: string,
    accessKeyId: string,
    secretAccessKey: string,
  ) {
    this.client = new S3Client({
      region: 'us-east-1',
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  async ensureBucket(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }
  async roundTrip(body: string): Promise<string> {
    const key = `integration/${randomUUID()}.txt`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: 'text/plain',
        Metadata: { classification: 'test-only' },
      }),
    );
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const text = await result.Body?.transformToString();
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    return text ?? '';
  }

  async putImmutable(input: {
    tenantId: string;
    householdId: string;
    objectId: string;
    body: Buffer;
    contentType: string;
  }): Promise<Readonly<{ key: string; checksumSha256: string }>> {
    const key = this.privateKey(input.tenantId, input.householdId, input.objectId);
    const checksumSha256 = createHash('sha256').update(input.body).digest('hex');
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: input.body,
          ContentType: input.contentType,
          IfNoneMatch: '*',
          Metadata: { checksumsha256: checksumSha256, classification: 'restricted' },
        }),
      );
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        '$metadata' in error &&
        (error.$metadata as { httpStatusCode?: number }).httpStatusCode === 412
      )
        throw new Error('IMMUTABLE_OBJECT_ALREADY_EXISTS');
      throw error;
    }
    return { key, checksumSha256 };
  }

  async getPrivate(input: {
    tenantId: string;
    householdId: string;
    objectId: string;
  }): Promise<Buffer> {
    const result = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: this.privateKey(input.tenantId, input.householdId, input.objectId),
      }),
    );
    const bytes = Buffer.from((await result.Body?.transformToByteArray()) ?? []);
    const expected = result.Metadata?.checksumsha256;
    if (!expected || createHash('sha256').update(bytes).digest('hex') !== expected)
      throw new Error('OBJECT_CHECKSUM_MISMATCH');
    return bytes;
  }

  async deletePrivate(input: {
    tenantId: string;
    householdId: string;
    objectId: string;
  }): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: this.privateKey(input.tenantId, input.householdId, input.objectId),
      }),
    );
  }

  private privateKey(tenantId: string, householdId: string, objectId: string): string {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (![tenantId, householdId, objectId].every((value) => uuid.test(value)))
      throw new Error('OBJECT_SCOPE_INVALID');
    return `private/${tenantId}/${householdId}/${objectId}`;
  }
}

export class RealEmail {
  private readonly transport: nodemailer.Transporter;
  constructor(url: string) {
    this.transport = nodemailer.createTransport(url);
  }
  async send(to: string, subject: string, text: string): Promise<string> {
    const result = await this.transport.sendMail({
      from: 'TomorrowReady Local <noreply@tomorrowready.invalid>',
      to,
      subject,
      text,
      headers: { 'X-TomorrowReady-Classification': 'test-only' },
    });
    return result.messageId;
  }
}
