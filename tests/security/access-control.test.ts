import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { authorize } from '../../packages/infrastructure/auth/src/index.js';
import { validateQuarantinedUpload } from '../../packages/infrastructure/security/src/index.js';

const tenantId = crypto.randomUUID();
const householdId = crypto.randomUUID();
const future = new Date(Date.now() + 60_000);

describe('deny-by-default authorization', () => {
  it('denies cross-tenant access before evaluating role grants', () => {
    const decision = authorize(
      {
        tenantId,
        householdId,
        role: 'owner',
        assurance: 'passkey',
        actionGrants: [],
        categoryGrants: [],
        packetGrants: [],
        purpose: 'manage-household',
      },
      'read',
      { tenantId: crypto.randomUUID(), householdId },
    );
    expect(decision).toEqual({ allowed: false, reason: 'TENANT_MISMATCH' });
  });

  it('requires step-up for emergency policy changes', () => {
    const decision = authorize(
      {
        tenantId,
        householdId,
        role: 'owner',
        assurance: 'password',
        actionGrants: [],
        categoryGrants: [],
        packetGrants: [],
        purpose: 'manage-emergency-policy',
      },
      'arm-emergency-policy',
      { tenantId, householdId },
    );
    expect(decision).toEqual({ allowed: false, reason: 'STEP_UP_REQUIRED' });
  });

  it('permits an owner only after strong assurance for a sensitive action', () => {
    expect(
      authorize(
        {
          tenantId,
          householdId,
          role: 'owner',
          assurance: 'passkey',
          actionGrants: [],
          categoryGrants: [],
          packetGrants: [],
          purpose: 'manage-emergency-policy',
        },
        'arm-emergency-policy',
        { tenantId, householdId },
      ),
    ).toEqual({ allowed: true });
  });

  it('keeps recipients packet-specific and non-enumerating', () => {
    const context = {
      tenantId,
      householdId,
      role: 'packet-recipient' as const,
      assurance: 'mfa' as const,
      actionGrants: ['download-packet'],
      categoryGrants: [],
      packetGrants: ['packet-approved'],
      purpose: 'receive-emergency-packet',
      expiresAt: future,
    };
    expect(
      authorize(context, 'download-packet', { tenantId, householdId, packetId: 'packet-approved' }),
    ).toEqual({ allowed: true });
    expect(
      authorize(context, 'download-packet', { tenantId, householdId, packetId: 'packet-other' }),
    ).toEqual({ allowed: false, reason: 'PACKET_NOT_GRANTED' });
  });

  it('requires customer approval, reason, action, and expiry for support', () => {
    const decision = authorize(
      {
        tenantId,
        householdId,
        role: 'support-agent',
        assurance: 'mfa',
        actionGrants: ['diagnose'],
        categoryGrants: ['metadata'],
        packetGrants: [],
        purpose: 'customer-requested-diagnosis',
        expiresAt: future,
        customerApproved: false,
        reason: 'ticket-42',
      },
      'diagnose',
      { tenantId, householdId, category: 'metadata' },
    );
    expect(decision).toEqual({ allowed: false, reason: 'SUPPORT_APPROVAL_REQUIRED' });
  });

  it('expires helper and support grants without a grace bypass', () => {
    const decision = authorize(
      {
        tenantId,
        householdId,
        role: 'trusted-helper',
        assurance: 'mfa',
        actionGrants: ['read'],
        categoryGrants: ['pets'],
        packetGrants: [],
        purpose: 'continuity help',
        expiresAt: new Date(0),
      },
      'read',
      { tenantId, householdId, category: 'pets' },
    );
    expect(decision).toEqual({ allowed: false, reason: 'GRANT_EXPIRED' });
  });
});

describe('quarantined upload boundary', () => {
  const policy = { maxBytes: 1024, allowedMimeTypes: { 'application/pdf': ['.pdf'] } };
  const pdf = Buffer.from('%PDF-1.7\nlocal test document');
  const upload = {
    filename: 'instructions.pdf',
    declaredMimeType: 'application/pdf',
    bytes: pdf,
    checksumSha256: createHash('sha256').update(pdf).digest('hex'),
    malwareStatus: 'clean' as const,
  };

  it('accepts only checksum-matched, magic-matched, malware-cleared content', () => {
    expect(validateQuarantinedUpload(upload, policy)).toEqual({
      accepted: true,
      detectedType: 'application/pdf',
    });
    expect(() =>
      validateQuarantinedUpload({ ...upload, checksumSha256: '0'.repeat(64) }, policy),
    ).toThrow('UPLOAD_CHECKSUM_MISMATCH');
    expect(() =>
      validateQuarantinedUpload({ ...upload, malwareStatus: 'pending' }, policy),
    ).toThrow('UPLOAD_NOT_MALWARE_CLEARED');
  });

  it('rejects executable signatures and declared-type mismatches in quarantine', () => {
    const executable = Buffer.from('4d5a900003000000', 'hex');
    expect(() =>
      validateQuarantinedUpload(
        {
          ...upload,
          bytes: executable,
          checksumSha256: createHash('sha256').update(executable).digest('hex'),
        },
        policy,
      ),
    ).toThrow('UPLOAD_EXECUTABLE_REJECTED');
    expect(() =>
      validateQuarantinedUpload({ ...upload, filename: 'instructions.jpg' }, policy),
    ).toThrow('UPLOAD_TYPE_REJECTED');
  });
});
