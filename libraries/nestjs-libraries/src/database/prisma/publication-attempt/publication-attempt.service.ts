import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, PublicationAttemptEventType } from '@prisma/client';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import {
  buildAttemptEvidence,
  buildErrorEvidence,
  canonicalSha256,
  normalizeProviderResult,
  ProviderPostEvidence,
  SafeProviderResult,
  signEvidenceHash,
} from '@gitroom/nestjs-libraries/database/prisma/publication-attempt/publication-attempt.evidence';

export type TemporalAttemptIdentity = {
  workflowId: string;
  runId: string;
  activityId: string;
  activityType: string;
  attempt: number;
};

export type CorrelatedPost = {
  postId: string;
  integration: string;
};

export type PublicationAttemptStart =
  | { action: 'untracked' }
  | { action: 'execute'; attemptId: string }
  | { action: 'replay-success'; result: ProviderResult[] }
  | { action: 'outcome-unknown' };

export type ProviderResult = {
  id: string;
  postId: string;
  releaseURL: string;
  status: string;
  pendingData?: unknown;
};

type PublicationDatabase = Prisma.TransactionClient | PrismaService;

const PROVIDER_REPORTED_SUCCESS = new Set([
  'completed',
  'posted',
  'published',
  'success',
]);
const PROVIDER_REPORTED_FAILURE = new Set(['error', 'failed', 'rejected']);

function correlatedPosts(request: {
  bindings: Array<{
    rootPostId: string;
    integrationId: string;
    position: number;
  }>;
}): CorrelatedPost[] {
  return [...request.bindings]
    .sort((a, b) => a.position - b.position)
    .map((binding) => ({
      postId: binding.rootPostId,
      integration: binding.integrationId,
    }));
}

export function isUniqueConstraintError(error: unknown): boolean {
  return (error as { code?: string })?.code === 'P2002';
}

@Injectable()
export class PublicationAttemptService {
  constructor(private readonly _prisma: PrismaService) {}

  private signingKey(): string {
    return process.env.POSTIZ_PUBLICATION_EVIDENCE_HMAC_KEY || '';
  }

  async resolvePublicationRequest(
    organizationId: string,
    correlationId: string,
    requestHash: string,
    database: PublicationDatabase = this._prisma
  ): Promise<CorrelatedPost[] | null> {
    const existing = await database.publicationRequest.findUnique({
      where: {
        organizationId_correlationId: { organizationId, correlationId },
      },
      include: { bindings: true },
    });

    if (!existing) {
      return null;
    }

    if (existing.requestHash !== requestHash) {
      throw new ConflictException(
        'X-Postify-Correlation-Id was already used for a different request'
      );
    }

    return correlatedPosts(existing);
  }

  async createPublicationRequest(
    database: Prisma.TransactionClient,
    input: {
      organizationId: string;
      correlationId: string;
      requestHash: string;
      posts: CorrelatedPost[];
    }
  ): Promise<void> {
    const integrations = await database.integration.findMany({
      where: {
        id: { in: input.posts.map((post) => post.integration) },
        organizationId: input.organizationId,
      },
      select: { id: true, customerId: true },
    });
    const integrationById = new Map(
      integrations.map((integration) => [integration.id, integration])
    );

    if (input.posts.some((post) => !integrationById.has(post.integration))) {
      throw new ConflictException(
        'A correlated post references an integration outside the organization'
      );
    }

    await database.publicationRequest.create({
      data: {
        organizationId: input.organizationId,
        correlationId: input.correlationId,
        requestHash: input.requestHash,
        bindings: {
          create: input.posts.map((post, position) => ({
            position,
            rootPostId: post.postId,
            integrationId: post.integration,
            customerId:
              integrationById.get(post.integration)?.customerId || null,
          })),
        },
      },
    });
  }

  private operationKey(
    publicationRequestBindingId: string,
    rootPostId: string,
    integrationId: string
  ) {
    return canonicalSha256({
      operation: 'provider-post',
      publicationRequestBindingId,
      rootPostId,
      integrationId,
    });
  }

  private eventData(
    attempt: {
      id: string;
      operationKey: string;
      evidenceHash: string;
    },
    input: {
      type: PublicationAttemptEventType;
      terminal: boolean;
      reason?: string;
      resultEvidence: unknown;
      platformReleaseId?: string | null;
      platformReleaseUrl?: string | null;
      blockRetry?: boolean;
    }
  ) {
    const createdAt = new Date();
    const resultHash = canonicalSha256(input.resultEvidence);
    const evidenceHash = canonicalSha256({
      attemptEvidenceHash: attempt.evidenceHash,
      createdAt: createdAt.toISOString(),
      type: input.type,
      terminal: input.terminal,
      reason: input.reason || null,
      platformReleaseId: input.platformReleaseId || null,
      platformReleaseUrl: input.platformReleaseUrl || null,
      resultHash,
    });

    return {
      publicationAttemptId: attempt.id,
      type: input.type,
      terminal: input.terminal,
      terminalAttemptId: input.terminal ? attempt.id : null,
      operationKey: input.blockRetry ? attempt.operationKey : null,
      reason: input.reason || null,
      platformReleaseId: input.platformReleaseId || null,
      platformReleaseUrl: input.platformReleaseUrl || null,
      resultEvidence: input.resultEvidence as Prisma.InputJsonValue,
      resultHash,
      evidenceHash,
      evidenceSignature: signEvidenceHash(evidenceHash, this.signingKey()),
      createdAt,
    };
  }

  private async createTerminalEvent(
    database: Prisma.TransactionClient,
    attempt: {
      id: string;
      rootPostId: string;
      operationKey: string;
      evidenceHash: string;
    },
    input: {
      type:
        | typeof PublicationAttemptEventType.PROVIDER_REPORTED_SUCCESS
        | typeof PublicationAttemptEventType.EXPLICIT_FAILURE
        | typeof PublicationAttemptEventType.UNKNOWN;
      reason?: string;
      resultEvidence: unknown;
      platformReleaseId?: string | null;
      platformReleaseUrl?: string | null;
    }
  ) {
    const existing = await database.publicationAttemptEvent.findFirst({
      where: { terminalAttemptId: attempt.id },
    });
    const event = this.eventData(attempt, {
      ...input,
      terminal: true,
      blockRetry: input.type !== PublicationAttemptEventType.EXPLICIT_FAILURE,
    });

    if (existing) {
      if (
        existing.type !== input.type ||
        existing.resultHash !== event.resultHash
      ) {
        throw new ConflictException(
          'Publication attempt already has a conflicting terminal claim'
        );
      }
      return existing;
    }

    const created = await database.publicationAttemptEvent.create({
      data: event,
    });
    if (input.type === PublicationAttemptEventType.PROVIDER_REPORTED_SUCCESS) {
      await database.post.update({
        where: { id: attempt.rootPostId },
        data: {
          state: 'PUBLISHED',
          releaseId: input.platformReleaseId || '',
          releaseURL: input.platformReleaseUrl || '',
          error: null,
        },
      });
    } else {
      await database.post.update({
        where: { id: attempt.rootPostId },
        data: {
          state: 'ERROR',
          error:
            input.type === PublicationAttemptEventType.UNKNOWN
              ? 'Provider outcome unknown; check the platform before retrying'
              : 'Provider explicitly rejected this publication attempt',
        },
      });
    }

    return created;
  }

  private replayResult(resultEvidence: Prisma.JsonValue): ProviderResult[] {
    const evidence = resultEvidence as {
      results?: SafeProviderResult[];
    };
    return (evidence.results || []).map((result) => ({
      id: result.postId,
      postId: result.platformReleaseId || '',
      releaseURL: result.platformReleaseUrl || '',
      status: 'success',
    }));
  }

  async beginPublicationAttempt(input: {
    integration: {
      id: string;
      internalId: string;
      organizationId: string;
      customerId?: string | null;
      providerIdentifier: string;
    };
    mappedPosts: ProviderPostEvidence[];
    identity: TemporalAttemptIdentity;
  }): Promise<PublicationAttemptStart> {
    const rootPostId = input.mappedPosts[0]?.id;
    if (!rootPostId) {
      return { action: 'untracked' };
    }

    const binding = await this._prisma.publicationRequestBinding.findUnique({
      where: { rootPostId },
      include: { publicationRequest: true },
    });
    if (!binding) {
      return { action: 'untracked' };
    }
    if (
      binding.integrationId !== input.integration.id ||
      binding.publicationRequest.organizationId !==
        input.integration.organizationId ||
      binding.customerId !== (input.integration.customerId || null)
    ) {
      throw new ConflictException(
        'Publication request binding does not match the provider activity'
      );
    }

    // Validate the key before opening the transaction. A correlated post must
    // never reach the provider without signed durable evidence.
    signEvidenceHash('preflight', this.signingKey());
    const operationKey = this.operationKey(
      binding.id,
      rootPostId,
      input.integration.id
    );

    return this._prisma.$transaction(
      async (database) => {
        const blocking = await database.publicationAttemptEvent.findUnique({
          where: { operationKey },
        });
        if (blocking) {
          if (
            blocking.type ===
            PublicationAttemptEventType.PROVIDER_REPORTED_SUCCESS
          ) {
            return {
              action: 'replay-success' as const,
              result: this.replayResult(blocking.resultEvidence),
            };
          }
          return { action: 'outcome-unknown' as const };
        }

        const openAttempt = await database.publicationAttempt.findFirst({
          where: {
            operationKey,
            events: { none: { terminal: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
        if (openAttempt) {
          const evidence = {
            claim: 'outcome-unknown',
            reason: 'previous-activity-attempt-did-not-record-a-terminal-claim',
          };
          await this.createTerminalEvent(database, openAttempt, {
            type: PublicationAttemptEventType.UNKNOWN,
            reason: 'previous-attempt-not-terminal',
            resultEvidence: evidence,
          });
          return { action: 'outcome-unknown' as const };
        }

        const payloadEvidence = buildAttemptEvidence(
          input.integration,
          input.mappedPosts
        );
        const createdAt = new Date();
        const immutableEvidence = {
          publicationRequestId: binding.publicationRequestId,
          correlationId: binding.publicationRequest.correlationId,
          organizationId: input.integration.organizationId,
          customerId: binding.customerId || null,
          rootPostId,
          integrationId: input.integration.id,
          providerIdentifier: input.integration.providerIdentifier,
          operationKey,
          workflowId: input.identity.workflowId,
          runId: input.identity.runId,
          activityId: input.identity.activityId,
          activityType: input.identity.activityType,
          temporalAttempt: input.identity.attempt,
          createdAt: createdAt.toISOString(),
          ...payloadEvidence,
        };
        const evidenceHash = canonicalSha256(immutableEvidence);
        const attempt = await database.publicationAttempt.create({
          data: {
            publicationRequestBindingId: binding.id,
            organizationId: input.integration.organizationId,
            customerId: binding.customerId || null,
            rootPostId,
            integrationId: input.integration.id,
            providerIdentifier: input.integration.providerIdentifier,
            operationKey,
            workflowId: input.identity.workflowId,
            runId: input.identity.runId,
            activityId: input.identity.activityId,
            activityType: input.identity.activityType,
            temporalAttempt: input.identity.attempt,
            captionEvidence:
              payloadEvidence.captionEvidence as Prisma.InputJsonValue,
            settingsEvidence:
              payloadEvidence.settingsEvidence as Prisma.InputJsonValue,
            mediaEvidence:
              payloadEvidence.mediaEvidence as Prisma.InputJsonValue,
            accountEvidence:
              payloadEvidence.accountEvidence as Prisma.InputJsonValue,
            outgoingPayloadHash: payloadEvidence.outgoingPayloadHash,
            evidenceHash,
            evidenceSignature: signEvidenceHash(
              evidenceHash,
              this.signingKey()
            ),
            createdAt,
          },
        });

        return { action: 'execute' as const, attemptId: attempt.id };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  async recordProviderResult(
    attemptId: string,
    rawResults: ProviderResult[]
  ): Promise<'accepted' | 'success' | 'explicit-failure' | 'unknown'> {
    const attemptEvidence =
      await this._prisma.publicationAttempt.findUniqueOrThrow({
        where: { id: attemptId },
        select: { captionEvidence: true },
      });
    const expectedPostIds = Array.isArray(attemptEvidence.captionEvidence)
      ? attemptEvidence.captionEvidence.map((item) => {
          if (
            !item ||
            typeof item !== 'object' ||
            Array.isArray(item) ||
            typeof (item as Record<string, unknown>).postId !== 'string' ||
            !(item as Record<string, unknown>).postId
          ) {
            return null;
          }
          return (item as Record<string, string>).postId;
        })
      : null;
    const resultPostIds = Array.isArray(rawResults)
      ? rawResults.map((result) =>
          result && typeof result.id === 'string' && result.id
            ? result.id
            : null
        )
      : null;
    const resultBindingMatches =
      expectedPostIds &&
      resultPostIds &&
      expectedPostIds.length > 0 &&
      expectedPostIds.length === resultPostIds.length &&
      new Set(expectedPostIds).size === expectedPostIds.length &&
      new Set(resultPostIds).size === resultPostIds.length &&
      expectedPostIds.every(
        (expectedPostId, position) =>
          expectedPostId !== null && expectedPostId === resultPostIds[position]
      );
    if (!resultBindingMatches) {
      await this.recordProviderFailure(
        attemptId,
        PublicationAttemptEventType.UNKNOWN,
        'provider-result-post-binding-mismatch',
        new Error(
          'Provider result post IDs did not match immutable attempt evidence'
        )
      );
      return 'unknown';
    }

    const statuses = rawResults.map((result) =>
      String(result.status || '').toLowerCase()
    );
    if (statuses.every((status) => PROVIDER_REPORTED_FAILURE.has(status))) {
      await this.recordProviderFailure(
        attemptId,
        PublicationAttemptEventType.EXPLICIT_FAILURE,
        'provider-returned-explicit-failure',
        new Error('Provider explicitly reported failure')
      );
      return 'explicit-failure';
    }
    if (
      statuses.some(
        (status) =>
          status !== 'pending' && !PROVIDER_REPORTED_SUCCESS.has(status)
      )
    ) {
      await this.recordProviderFailure(
        attemptId,
        PublicationAttemptEventType.UNKNOWN,
        'unrecognized-or-mixed-provider-result',
        new Error('Provider returned an unrecognized or mixed result status')
      );
      return 'unknown';
    }

    const results = normalizeProviderResult(rawResults);
    if (
      results.every(
        (result) => result.status === 'provider-reported-success'
      ) &&
      results.some(
        (result) =>
          !result.platformReleaseId ||
          !result.platformReleaseUrl ||
          !result.postId
      )
    ) {
      await this.recordProviderFailure(
        attemptId,
        PublicationAttemptEventType.UNKNOWN,
        'incomplete-provider-success-result',
        new Error('Provider success omitted a release id or URL')
      );
      return 'unknown';
    }

    const resultEvidence = {
      claim: results.some((result) => result.status === 'provider-accepted')
        ? 'provider-accepted'
        : 'provider-reported-success',
      independentlyPlatformVerified: false,
      results,
    };

    if (results.some((result) => result.status === 'provider-accepted')) {
      return this._prisma.$transaction(async (database) => {
        const attempt = await database.publicationAttempt.findUniqueOrThrow({
          where: { id: attemptId },
        });
        const existing = await database.publicationAttemptEvent.findUnique({
          where: {
            publicationAttemptId_type: {
              publicationAttemptId: attemptId,
              type: PublicationAttemptEventType.PROVIDER_ACCEPTED,
            },
          },
        });
        const event = this.eventData(attempt, {
          type: PublicationAttemptEventType.PROVIDER_ACCEPTED,
          terminal: false,
          resultEvidence,
        });
        if (existing) {
          if (existing.resultHash !== event.resultHash) {
            throw new ConflictException(
              'Publication attempt has conflicting provider acceptance evidence'
            );
          }
          return 'accepted' as const;
        }
        await database.publicationAttemptEvent.create({ data: event });
        return 'accepted' as const;
      });
    }

    const first = results[0];
    return this._prisma.$transaction(async (database) => {
      const attempt = await database.publicationAttempt.findUniqueOrThrow({
        where: { id: attemptId },
      });
      await this.createTerminalEvent(database, attempt, {
        type: PublicationAttemptEventType.PROVIDER_REPORTED_SUCCESS,
        resultEvidence,
        platformReleaseId: first.platformReleaseId,
        platformReleaseUrl: first.platformReleaseUrl,
      });
      return 'success' as const;
    });
  }

  async recordProviderFailure(
    attemptId: string,
    type:
      | typeof PublicationAttemptEventType.EXPLICIT_FAILURE
      | typeof PublicationAttemptEventType.UNKNOWN,
    reason: string,
    error: unknown
  ): Promise<void> {
    const resultEvidence = {
      claim:
        type === PublicationAttemptEventType.EXPLICIT_FAILURE
          ? 'explicit-provider-failure'
          : 'outcome-unknown',
      independentlyPlatformVerified: false,
      error: buildErrorEvidence(error, reason),
    };
    await this._prisma.$transaction(async (database) => {
      const attempt = await database.publicationAttempt.findUniqueOrThrow({
        where: { id: attemptId },
      });
      await this.createTerminalEvent(database, attempt, {
        type,
        reason,
        resultEvidence,
      });
    });
  }

  async completeFromWorkflow(
    postId: string,
    platformReleaseId: string,
    platformReleaseUrl: string,
    identity: Pick<TemporalAttemptIdentity, 'workflowId' | 'runId'>
  ): Promise<boolean> {
    const attempt = await this._prisma.publicationAttempt.findFirst({
      where: {
        rootPostId: postId,
        workflowId: identity.workflowId,
        runId: identity.runId,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!attempt) {
      return false;
    }

    await this.recordProviderResult(attempt.id, [
      {
        id: postId,
        postId: platformReleaseId,
        releaseURL: platformReleaseUrl,
        status: 'success',
      },
    ]);
    return true;
  }

  async markOpenAttemptTerminal(
    postId: string,
    identity: Pick<TemporalAttemptIdentity, 'workflowId' | 'runId'>,
    type:
      | typeof PublicationAttemptEventType.EXPLICIT_FAILURE
      | typeof PublicationAttemptEventType.UNKNOWN,
    reason: string
  ): Promise<boolean> {
    return this._prisma.$transaction(async (database) => {
      const attempt = await database.publicationAttempt.findFirst({
        where: {
          rootPostId: postId,
          workflowId: identity.workflowId,
          runId: identity.runId,
          events: { none: { terminal: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (!attempt) {
        return false;
      }

      await this.createTerminalEvent(database, attempt, {
        type,
        reason,
        resultEvidence: {
          claim:
            type === PublicationAttemptEventType.EXPLICIT_FAILURE
              ? 'explicit-provider-failure'
              : 'outcome-unknown',
          independentlyPlatformVerified: false,
          reason,
        },
      });
      return true;
    });
  }

  async isCorrelatedPost(rootPostId: string): Promise<boolean> {
    return !!(await this._prisma.publicationRequestBinding.findUnique({
      where: { rootPostId },
      select: { id: true },
    }));
  }

  async hasProviderReportedSuccess(
    rootPostId: string,
    identity: Pick<TemporalAttemptIdentity, 'workflowId' | 'runId'>
  ): Promise<boolean> {
    return !!(await this._prisma.publicationAttemptEvent.findFirst({
      where: {
        type: PublicationAttemptEventType.PROVIDER_REPORTED_SUCCESS,
        publicationAttempt: {
          rootPostId,
          workflowId: identity.workflowId,
          runId: identity.runId,
        },
      },
      select: { id: true },
    }));
  }
}
