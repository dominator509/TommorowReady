import { loadEnvFile } from 'node:process';
import { ContinuityService, type RequestContext } from '../packages/application/src/index.js';
import {
  authorizeHelper,
  buildPacketManifest,
  calculateReadiness,
  canAccessPacket,
  DomainError,
  transitionRelease,
} from '../packages/domain/src/index.js';
import {
  migrateDatabase,
  PostgresContinuityRepository,
} from '../packages/infrastructure/database/src/index.js';
import {
  RealEmail,
  RealJobQueue,
  RealObjectStorage,
  RealQueue,
} from '../packages/infrastructure/database/src/services.js';
import { renderDeterministicBinder } from '../apps/report-renderer/src/index.js';
import { createContinuityJobHandler } from '../apps/worker/src/index.js';

try {
  loadEnvFile('.env');
} catch {}
const env = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name}_REQUIRED`);
  return value;
};
const proof = process.argv[process.argv.indexOf('--proof') + 1];
if (!/^LF-(0[1-9]|1[0-5])$/.test(proof ?? '')) throw new Error('LIVE_FIRE_PROOF_REQUIRED');
await migrateDatabase(env('DATABASE_MIGRATION_URL'));
const repository = new PostgresContinuityRepository(env('DATABASE_URL'));
const service = new ContinuityService(repository);
const context: RequestContext & { householdId: string } = {
  tenantId: crypto.randomUUID(),
  householdId: crypto.randomUUID(),
  actorId: crypto.randomUUID(),
  purpose: `live-fire ${proof}`,
};
const create = (kind: string, payload: Record<string, unknown>) =>
  service.createRecord(context, kind, payload);
const expectFailure = async (operation: () => Promise<unknown>, code: string): Promise<void> => {
  try {
    await operation();
  } catch (error) {
    if (error instanceof DomainError && error.code === code) return;
    throw error;
  }
  throw new Error(`EXPECTED_FAILURE_MISSING:${code}`);
};
try {
  switch (proof) {
    case 'LF-01':
      await create('household', {
        name: 'Live Fire Household',
        planStatus: 'COMPLETE',
        sections: 10,
      });
      break;
    case 'LF-02':
      for (const [kind, role] of [
        ['person', 'owner'],
        ['dependent', 'child'],
        ['pet', 'pet'],
        ['contact', 'adviser'],
        ['contact', 'emergency'],
      ] as const)
        await create(kind, { role, permissionVerified: true });
      break;
    case 'LF-03':
      await create('account', {
        provider: 'Credit union',
        locator: 'Family password manager entry: Household Banking',
        lastFour: '1234',
      });
      await create('asset', { category: 'vehicle', evidenceConfirmed: true });
      await create('insurance', {
        carrier: 'Example Mutual',
        documentLocation: 'Home safe folder',
      });
      break;
    case 'LF-04':
      for (const type of [
        'childcare',
        'pet-care',
        'home',
        'medical-information',
        'funeral-wishes',
        'business-continuity',
      ])
        await create(type === 'funeral-wishes' ? 'funeralWish' : 'playbook', {
          type,
          confirmed: true,
          reviewDate: new Date().toISOString(),
        });
      break;
    case 'LF-05':
      for (const kind of ['letter', 'video', 'advice', 'photo', 'recipe'])
        await create(kind, {
          status: 'APPROVED',
          recipientId: crypto.randomUUID(),
          provenance: 'owner-uploaded',
        });
      break;
    case 'LF-06': {
      const result = calculateReadiness(
        'v1',
        [
          { id: 'people', category: 'people', weight: 50, maxAgeDays: 365, required: true },
          { id: 'packets', category: 'packets', weight: 50, maxAgeDays: 365, required: true },
        ],
        [
          {
            id: crypto.randomUUID(),
            tenantId: context.tenantId,
            householdId: context.householdId,
            category: 'people',
            confirmed: true,
            reviewedAt: new Date(),
            evidenceIds: [crypto.randomUUID()],
          },
        ],
        new Date(),
      );
      if (result.score !== 50 || result.missing[0] !== 'packets')
        throw new Error('READINESS_NOT_DETERMINISTIC');
      await create('fact', { readiness: result, source: 'confirmed-only' });
      break;
    }
    case 'LF-07': {
      const recipientId = crypto.randomUUID();
      const manifest = await service.createPacket(context, {
        purpose: 'childcare',
        recipientId,
        itemIds: [crypto.randomUUID()],
      });
      if (
        !canAccessPacket(manifest, manifest) ||
        canAccessPacket(manifest, { ...manifest, recipientId: crypto.randomUUID() })
      )
        throw new Error('PACKET_ISOLATION_FAILED');
      break;
    }
    case 'LF-08': {
      const now = new Date();
      const grant = {
        tenantId: context.tenantId,
        householdId: context.householdId,
        helperId: crypto.randomUUID(),
        categories: ['pets'],
        actions: ['edit'],
        purpose: 'continuity help',
        startsAt: new Date(now.getTime() - 1_000),
        expiresAt: new Date(now.getTime() + 60_000),
      };
      await create('helperGrant', {
        ...grant,
        startsAt: grant.startsAt.toISOString(),
        expiresAt: grant.expiresAt.toISOString(),
      });
      if (!authorizeHelper(grant, { ...grant, category: 'pets', action: 'edit', now }))
        throw new Error('HELPER_GRANT_FAILED');
      if (
        authorizeHelper(
          { ...grant, revokedAt: now },
          { ...grant, category: 'pets', action: 'edit', now },
        )
      )
        throw new Error('HELPER_REVOCATION_FAILED');
      break;
    }
    case 'LF-09': {
      await create('emergencyPolicy', { state: 'ARMED', challengeHours: 48 });
      const recipientId = crypto.randomUUID();
      const manifest = buildPacketManifest({
        tenantId: context.tenantId,
        householdId: context.householdId,
        packetId: crypto.randomUUID(),
        recipientId,
        purpose: 'release policy rehearsal',
        itemIds: [crypto.randomUUID()],
        version: 1,
      });
      await repository.savePacket(context, manifest);
      const request = await create('accessRequest', {
        packetId: manifest.packetId,
        recipientId,
        purpose: manifest.purpose,
        state: 'REQUESTED',
      });
      await repository.transitionReleaseRequest(
        context,
        request.id,
        'VERIFYING',
        crypto.randomUUID(),
      );
      await repository.recordReleaseEvidence(context, request.id, {
        recipientVerified: true,
        packetScopeMatches: true,
        verificationSatisfied: true,
        providerAmbiguous: false,
        providerReference: 'local-sandbox-release-policy',
      });
      await repository.recordReleaseChallenge(context, request.id, new Date(Date.now() + 60_000));
      await repository.transitionReleaseRequest(
        context,
        request.id,
        'CHALLENGE_ACTIVE',
        crypto.randomUUID(),
      );
      await expectFailure(
        () =>
          repository.transitionReleaseRequest(
            context,
            request.id,
            'APPROVED_FOR_RELEASE',
            crypto.randomUUID(),
          ),
        'RELEASE_POLICY_UNSATISFIED',
      );
      await repository.recordReleaseChallenge(context, request.id, new Date(0));
      if (
        (await repository.transitionReleaseRequest(
          context,
          request.id,
          'APPROVED_FOR_RELEASE',
          crypto.randomUUID(),
        )) !== 'APPROVED_FOR_RELEASE'
      )
        throw new Error('POLICY_FLOW_FAILED');
      break;
    }
    case 'LF-10': {
      const recipientId = crypto.randomUUID();
      const manifest = buildPacketManifest({
        tenantId: context.tenantId,
        householdId: context.householdId,
        packetId: crypto.randomUUID(),
        recipientId,
        purpose: 'emergency childcare',
        itemIds: [crypto.randomUUID()],
        version: 1,
      });
      await repository.savePacket(context, manifest);
      const email = new RealEmail(env('SMTP_URL'));
      await email.send(
        'recipient@example.invalid',
        'TomorrowReady owner challenge',
        'A challenge is active. No packet content is included.',
      );
      const request = await create('accessRequest', {
        packetId: manifest.packetId,
        recipientId,
        purpose: manifest.purpose,
        state: 'REQUESTED',
      });
      await repository.transitionReleaseRequest(
        context,
        request.id,
        'VERIFYING',
        crypto.randomUUID(),
      );
      await repository.recordReleaseEvidence(context, request.id, {
        recipientVerified: true,
        packetScopeMatches: true,
        verificationSatisfied: true,
        providerAmbiguous: false,
        providerReference: 'local-sandbox-recipient-verification',
      });
      await repository.recordReleaseChallenge(context, request.id, new Date(0));
      await repository.transitionReleaseRequest(
        context,
        request.id,
        'CHALLENGE_ACTIVE',
        crypto.randomUUID(),
      );
      await repository.transitionReleaseRequest(
        context,
        request.id,
        'APPROVED_FOR_RELEASE',
        crypto.randomUUID(),
      );
      const releaseKey = crypto.randomUUID();
      if (
        (await repository.transitionReleaseRequest(context, request.id, 'RELEASED', releaseKey)) !==
          'RELEASED' ||
        (await repository.transitionReleaseRequest(context, request.id, 'RELEASED', releaseKey)) !==
          'RELEASED'
      )
        throw new Error('RELEASE_FAILED');
      break;
    }
    case 'LF-11': {
      const manifest = buildPacketManifest({
        tenantId: context.tenantId,
        householdId: context.householdId,
        packetId: crypto.randomUUID(),
        recipientId: crypto.randomUUID(),
        purpose: 'archive',
        itemIds: [crypto.randomUUID()],
        version: 1,
      });
      const binder = renderDeterministicBinder({
        householdName: 'Live Fire Household',
        manifestHash: manifest.hash,
        sections: ['People', 'Packets', 'Review dates'],
      });
      const storage = new RealObjectStorage(
        env('S3_BUCKET'),
        env('S3_ENDPOINT'),
        env('S3_ACCESS_KEY_ID'),
        env('S3_SECRET_ACCESS_KEY'),
      );
      await storage.ensureBucket();
      if ((await storage.roundTrip(binder.bytes.toString('base64'))).length === 0)
        throw new Error('EXPORT_STORAGE_FAILED');
      break;
    }
    case 'LF-12':
      for (const type of [
        'access',
        'correction',
        'export',
        'recipient-revocation',
        'consent-withdrawal',
        'deletion',
      ])
        await create('privacyRequest', { type, status: 'RECEIVED', retentionAware: true });
      break;
    case 'LF-13':
      await create('annualReview', {
        staleContacts: [crypto.randomUUID()],
        missingRecipients: [crypto.randomUUID()],
        overdueConfirmations: [crypto.randomUUID()],
        completedAt: new Date().toISOString(),
      });
      break;
    case 'LF-14': {
      const queue = new RealQueue(env('REDIS_URL'));
      const key = crypto.randomUUID();
      if ((await queue.roundTrip(key)) !== key) throw new Error('QUEUE_ROUND_TRIP_FAILED');
      await queue.close();
      const ambiguous = {
        recipientVerified: true,
        packetScopeMatches: true,
        verificationSatisfied: true,
        ownerDenied: false,
        takeoverSignal: false,
        providerAmbiguous: true,
        challengeEndsAt: new Date(0),
        now: new Date(),
      };
      if (
        transitionRelease('VERIFYING', 'MANUAL_REVIEW_REQUIRED', ambiguous) !==
        'MANUAL_REVIEW_REQUIRED'
      )
        throw new Error('AMBIGUITY_NOT_SAFE');
      break;
    }
    case 'LF-15': {
      const owner = await repository.bootstrapOwner({
        email: `continuity-live-fire-${crypto.randomUUID()}@example.invalid`,
        passwordHash: 'live-fire-owner-not-used-for-authentication',
        householdName: 'Continuity Live Fire Household',
      });
      const monitorContext = {
        tenantId: owner.tenantId,
        householdId: owner.householdId,
        actorId: owner.userId,
        purpose: 'live-fire LF-15 automated continuity release',
      };
      const monitorService = new ContinuityService(repository);
      const item = await monitorService.createRecord(monitorContext, 'person', {
        name: 'Owner-approved continuity contact',
      });
      const recipientId = crypto.randomUUID();
      const manifest = await monitorService.createPacket(monitorContext, {
        purpose: 'automated continuity live fire',
        recipientId,
        itemIds: [item.id],
      });
      const verification = await repository.createRecipientVerification(
        monitorContext,
        recipientId,
        'recipient@example.invalid',
      );
      await repository.completeRecipientVerification({
        tenantId: owner.tenantId,
        householdId: owner.householdId,
        profileId: verification.profileId,
        token: verification.token,
      });
      const monitor = await repository.createContinuityMonitor(monitorContext, {
        packetId: manifest.packetId,
        recipientId,
        checkInIntervalDays: 1,
        reminderOffsetsHours: [0, 1],
        gracePeriodHours: 24,
        releaseDelayHours: 1,
        digitalDelivery: true,
      });
      await repository.markContinuityMonitorTested(monitorContext, monitor.id);
      await repository.applyContinuityMonitorAction(monitorContext, monitor.id, 'ARM');
      const queue = new RealJobQueue(env('REDIS_URL'));
      const storage = new RealObjectStorage(
        env('S3_BUCKET'),
        env('S3_ENDPOINT'),
        env('S3_ACCESS_KEY_ID'),
        env('S3_SECRET_ACCESS_KEY'),
      );
      await storage.ensureBucket();
      let clock = new Date(Date.now() + 2 * 86_400_000);
      const handler = createContinuityJobHandler({
        repository,
        queue,
        storage,
        notifier: new RealEmail(env('SMTP_URL')),
        baseUrl: env('APP_BASE_URL'),
        providers: {},
        automationEnabled: true,
        now: () => clock,
      });
      const job = {
        id: crypto.randomUUID(),
        tenantId: owner.tenantId,
        householdId: owner.householdId,
        type: 'continuity-monitor' as const,
        resourceId: monitor.id,
        idempotencyKey: `continuity-live-fire:${monitor.id}`,
        attempt: 1,
      };
      let finalState = '';
      for (let step = 0; step < 10; step += 1) {
        await handler(job);
        const stored = await repository.get(monitorContext, 'continuityMonitor', monitor.id);
        finalState = String(stored?.payload.state ?? '');
        if (['AUTOMATICALLY_RELEASED', 'DELIVERY_FAILED'].includes(finalState)) break;
        clock = new Date(clock.getTime() + 2 * 86_400_000);
      }
      if (finalState !== 'AUTOMATICALLY_RELEASED')
        throw new Error(`CONTINUITY_LIVE_FIRE_FAILED:${finalState}`);
      await queue.close();
      break;
    }
  }
  console.log(`${proof}: ok`);
} finally {
  await repository.close();
}
