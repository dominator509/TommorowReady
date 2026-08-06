import { randomUUID } from 'node:crypto';
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
