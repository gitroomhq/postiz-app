import { ConflictException } from '@nestjs/common';
import { PublicationAttemptEventType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicationAttemptService } from './publication-attempt.service';

function databaseDouble() {
  const database = {
    publicationRequest: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    publicationRequestBinding: {
      findUnique: vi.fn(),
    },
    publicationAttempt: {
      findFirst: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
    },
    publicationAttemptEvent: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    integration: {
      findMany: vi.fn(),
    },
    post: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  database.$transaction.mockImplementation(
    async (callback: (transaction: typeof database) => unknown) =>
      callback(database)
  );
  return database;
}

const attempt = {
  id: 'attempt-1',
  rootPostId: 'post-1',
  operationKey: 'operation-1',
  evidenceHash: 'evidence-hash',
  captionEvidence: [{ postId: 'post-1', caption: 'approved caption' }],
};

describe('PublicationAttemptService', () => {
  beforeEach(() => {
    process.env.POSTIZ_PUBLICATION_EVIDENCE_HMAC_KEY =
      '0123456789abcdef0123456789abcdef';
  });

  it('rejects conflicting correlation reuse', async () => {
    const database = databaseDouble();
    database.publicationRequest.findUnique.mockResolvedValue({
      requestHash: 'first-request-hash',
      bindings: [],
    });
    const service = new PublicationAttemptService(database as never);

    await expect(
      service.resolvePublicationRequest(
        'org-1',
        'correlation-1',
        'different-request-hash'
      )
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns the original roots for an idempotent correlation replay', async () => {
    const database = databaseDouble();
    database.publicationRequest.findUnique.mockResolvedValue({
      requestHash: 'same-hash',
      bindings: [
        { rootPostId: 'post-2', integrationId: 'int-2', position: 1 },
        { rootPostId: 'post-1', integrationId: 'int-1', position: 0 },
      ],
    });
    const service = new PublicationAttemptService(database as never);

    await expect(
      service.resolvePublicationRequest('org-1', 'correlation-1', 'same-hash')
    ).resolves.toEqual([
      { postId: 'post-1', integration: 'int-1' },
      { postId: 'post-2', integration: 'int-2' },
    ]);
  });

  it('binds organization, customer, root post, and integration at creation', async () => {
    const database = databaseDouble();
    database.integration.findMany.mockResolvedValue([
      { id: 'integration-1', customerId: 'customer-1' },
    ]);
    const service = new PublicationAttemptService(database as never);

    await service.createPublicationRequest(database as never, {
      organizationId: 'org-1',
      correlationId: 'correlation-1',
      requestHash: 'request-hash-1',
      posts: [{ postId: 'post-1', integration: 'integration-1' }],
    });

    expect(database.publicationRequest.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-1',
        correlationId: 'correlation-1',
        requestHash: 'request-hash-1',
        bindings: {
          create: [
            {
              position: 0,
              rootPostId: 'post-1',
              integrationId: 'integration-1',
              customerId: 'customer-1',
            },
          ],
        },
      },
    });
  });

  it('replays a recorded success instead of opening a retry attempt', async () => {
    const database = databaseDouble();
    database.publicationRequestBinding.findUnique.mockResolvedValue({
      id: 'binding-1',
      integrationId: 'integration-1',
      customerId: null,
      publicationRequestId: 'request-1',
      publicationRequest: {
        organizationId: 'org-1',
        correlationId: 'correlation-1',
      },
    });
    database.publicationAttemptEvent.findUnique.mockResolvedValue({
      type: PublicationAttemptEventType.PROVIDER_REPORTED_SUCCESS,
      resultEvidence: {
        results: [
          {
            postId: 'post-1',
            status: 'provider-reported-success',
            platformReleaseId: 'platform-1',
            platformReleaseUrl: 'https://platform.test/1',
          },
        ],
      },
    });
    const service = new PublicationAttemptService(database as never);

    const result = await service.beginPublicationAttempt({
      integration: {
        id: 'integration-1',
        internalId: 'account-1',
        organizationId: 'org-1',
        providerIdentifier: 'example',
      },
      mappedPosts: [
        { id: 'post-1', message: 'caption', settings: {}, media: [] },
      ],
      identity: {
        workflowId: 'workflow-1',
        runId: 'run-1',
        activityId: 'activity-2',
        activityType: 'postSocialPending',
        attempt: 2,
      },
    });

    expect(result).toEqual({
      action: 'replay-success',
      result: [
        {
          id: 'post-1',
          postId: 'platform-1',
          releaseURL: 'https://platform.test/1',
          status: 'success',
        },
      ],
    });
    expect(database.publicationAttempt.create).not.toHaveBeenCalled();
  });

  it('opens a new durable attempt after an explicit failure retry', async () => {
    const database = databaseDouble();
    database.publicationRequestBinding.findUnique.mockResolvedValue({
      id: 'binding-1',
      integrationId: 'integration-1',
      customerId: 'customer-1',
      publicationRequestId: 'request-1',
      publicationRequest: {
        organizationId: 'org-1',
        correlationId: 'correlation-1',
      },
    });
    database.publicationAttemptEvent.findUnique.mockResolvedValue(null);
    database.publicationAttempt.findFirst.mockResolvedValue(null);
    database.publicationAttempt.create.mockResolvedValue({ id: 'attempt-2' });
    const service = new PublicationAttemptService(database as never);

    await expect(
      service.beginPublicationAttempt({
        integration: {
          id: 'integration-1',
          internalId: 'account-1',
          organizationId: 'org-1',
          customerId: 'customer-1',
          providerIdentifier: 'example',
        },
        mappedPosts: [
          { id: 'post-1', message: 'caption', settings: {}, media: [] },
        ],
        identity: {
          workflowId: 'workflow-1',
          runId: 'run-1',
          activityId: 'activity-2',
          activityType: 'postSocialPending',
          attempt: 2,
        },
      })
    ).resolves.toEqual({ action: 'execute', attemptId: 'attempt-2' });

    expect(database.publicationAttempt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workflowId: 'workflow-1',
        runId: 'run-1',
        activityId: 'activity-2',
        temporalAttempt: 2,
      }),
    });
  });

  it('atomically stores provider-reported success and the Postiz projection', async () => {
    const database = databaseDouble();
    database.publicationAttempt.findUniqueOrThrow.mockResolvedValue(attempt);
    database.publicationAttemptEvent.findFirst.mockResolvedValue(null);
    database.publicationAttemptEvent.create.mockResolvedValue({
      id: 'event-1',
    });
    database.post.update.mockResolvedValue({ id: 'post-1' });
    const service = new PublicationAttemptService(database as never);

    await expect(
      service.recordProviderResult('attempt-1', [
        {
          id: 'post-1',
          postId: 'platform-1',
          releaseURL: 'https://platform.test/1',
          status: 'success',
        },
      ])
    ).resolves.toBe('success');

    expect(database.$transaction).toHaveBeenCalledTimes(1);
    expect(database.publicationAttemptEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: PublicationAttemptEventType.PROVIDER_REPORTED_SUCCESS,
          terminal: true,
          operationKey: 'operation-1',
          platformReleaseId: 'platform-1',
          platformReleaseUrl: 'https://platform.test/1',
        }),
      })
    );
    expect(database.post.update).toHaveBeenCalledWith({
      where: { id: 'post-1' },
      data: {
        state: 'PUBLISHED',
        releaseId: 'platform-1',
        releaseURL: 'https://platform.test/1',
        error: null,
      },
    });
  });

  it.each([
    {
      name: 'wrong singleton id',
      captionEvidence: [{ postId: 'post-1' }],
      rawResults: [
        {
          id: 'wrong-post',
          postId: 'platform-1',
          releaseURL: 'https://platform.test/1',
          status: 'success',
        },
      ],
    },
    {
      name: 'missing result',
      captionEvidence: [{ postId: 'post-1' }, { postId: 'post-2' }],
      rawResults: [
        {
          id: 'post-1',
          postId: 'platform-1',
          releaseURL: 'https://platform.test/1',
          status: 'success',
        },
      ],
    },
    {
      name: 'extra result',
      captionEvidence: [{ postId: 'post-1' }],
      rawResults: [
        {
          id: 'post-1',
          postId: 'platform-1',
          releaseURL: 'https://platform.test/1',
          status: 'success',
        },
        {
          id: 'post-2',
          postId: 'platform-2',
          releaseURL: 'https://platform.test/2',
          status: 'success',
        },
      ],
    },
    {
      name: 'reversed results',
      captionEvidence: [{ postId: 'post-1' }, { postId: 'post-2' }],
      rawResults: [
        {
          id: 'post-2',
          postId: 'platform-2',
          releaseURL: 'https://platform.test/2',
          status: 'success',
        },
        {
          id: 'post-1',
          postId: 'platform-1',
          releaseURL: 'https://platform.test/1',
          status: 'success',
        },
      ],
    },
    {
      name: 'malformed pending result',
      captionEvidence: [{ postId: 'post-1' }],
      rawResults: [
        {
          id: undefined,
          postId: '',
          releaseURL: '',
          status: 'pending',
          pendingData: { accessToken: 'never-store-me' },
        },
      ],
    },
  ])('records $name as unknown before classification', async (testCase) => {
    const database = databaseDouble();
    database.publicationAttempt.findUniqueOrThrow.mockResolvedValue({
      ...attempt,
      captionEvidence: testCase.captionEvidence,
    });
    database.publicationAttemptEvent.findFirst.mockResolvedValue(null);
    database.publicationAttemptEvent.create.mockResolvedValue({
      id: 'event-1',
    });
    database.post.update.mockResolvedValue({ id: 'post-1' });
    const service = new PublicationAttemptService(database as never);

    await expect(
      service.recordProviderResult('attempt-1', testCase.rawResults as never)
    ).resolves.toBe('unknown');

    expect(database.publicationAttemptEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: PublicationAttemptEventType.UNKNOWN,
          reason: 'provider-result-post-binding-mismatch',
        }),
      })
    );
    expect(database.post.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ state: 'PUBLISHED' }),
      })
    );
    expect(
      JSON.stringify(
        database.publicationAttemptEvent.create.mock.calls[0][0].data
          .resultEvidence
      )
    ).not.toContain('never-store-me');
  });

  it('stores an explicit failure without raw provider response content', async () => {
    const database = databaseDouble();
    database.publicationAttempt.findUniqueOrThrow.mockResolvedValue(attempt);
    database.publicationAttemptEvent.findFirst.mockResolvedValue(null);
    database.publicationAttemptEvent.create.mockResolvedValue({
      id: 'event-1',
    });
    database.post.update.mockResolvedValue({ id: 'post-1' });
    const service = new PublicationAttemptService(database as never);
    const raw = 'provider body containing access_token=do-not-store';
    const error = Object.assign(new Error(raw), {
      type: 'token=provider-error-secret',
      code: 'Bearer provider-code-secret',
    });

    await service.recordProviderFailure(
      'attempt-1',
      PublicationAttemptEventType.EXPLICIT_FAILURE,
      'provider-explicitly-rejected',
      error
    );

    const event = database.publicationAttemptEvent.create.mock.calls[0][0];
    expect(event.data.type).toBe(PublicationAttemptEventType.EXPLICIT_FAILURE);
    expect(event.data.operationKey).toBeNull();
    expect(JSON.stringify(event.data.resultEvidence)).not.toContain(raw);
    expect(JSON.stringify(event.data.resultEvidence)).not.toContain(
      'provider-error-secret'
    );
    expect(JSON.stringify(event.data.resultEvidence)).not.toContain(
      'provider-code-secret'
    );
    expect(database.post.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ state: 'ERROR' }),
      })
    );
  });

  it('recognizes current provider success and explicit failure statuses', async () => {
    const database = databaseDouble();
    database.publicationAttempt.findUniqueOrThrow.mockResolvedValue(attempt);
    database.publicationAttemptEvent.findFirst.mockResolvedValue(null);
    database.publicationAttemptEvent.create.mockResolvedValue({
      id: 'event-1',
    });
    database.post.update.mockResolvedValue({ id: 'post-1' });
    const service = new PublicationAttemptService(database as never);

    await expect(
      service.recordProviderResult('attempt-1', [
        {
          id: 'post-1',
          postId: 'platform-1',
          releaseURL: 'https://platform.test/1',
          status: 'completed',
        },
      ])
    ).resolves.toBe('success');

    database.publicationAttemptEvent.findFirst.mockResolvedValue(null);
    await expect(
      service.recordProviderResult('attempt-2', [
        {
          id: 'post-1',
          postId: '',
          releaseURL: '',
          status: 'error',
        },
      ])
    ).resolves.toBe('explicit-failure');
    expect(database.publicationAttemptEvent.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: PublicationAttemptEventType.EXPLICIT_FAILURE,
        }),
      })
    );
  });

  it('records an incomplete provider success as unknown instead of published', async () => {
    const database = databaseDouble();
    database.publicationAttempt.findUniqueOrThrow.mockResolvedValue(attempt);
    database.publicationAttemptEvent.findFirst.mockResolvedValue(null);
    database.publicationAttemptEvent.create.mockResolvedValue({
      id: 'event-1',
    });
    database.post.update.mockResolvedValue({ id: 'post-1' });
    const service = new PublicationAttemptService(database as never);

    await expect(
      service.recordProviderResult('attempt-1', [
        {
          id: 'post-1',
          postId: '',
          releaseURL: '',
          status: 'success',
        },
      ])
    ).resolves.toBe('unknown');

    expect(database.publicationAttemptEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: PublicationAttemptEventType.UNKNOWN,
        }),
      })
    );
    expect(database.post.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ state: 'ERROR' }),
      })
    );
  });

  it('turns a timed-out open attempt into an unknown terminal claim', async () => {
    const database = databaseDouble();
    database.publicationAttempt.findFirst.mockResolvedValue(attempt);
    database.publicationAttemptEvent.findFirst.mockResolvedValue(null);
    database.publicationAttemptEvent.create.mockResolvedValue({
      id: 'event-1',
    });
    database.post.update.mockResolvedValue({ id: 'post-1' });
    const service = new PublicationAttemptService(database as never);

    await expect(
      service.markOpenAttemptTerminal(
        'post-1',
        { workflowId: 'workflow-1', runId: 'run-1' },
        PublicationAttemptEventType.UNKNOWN,
        'activity-timeout'
      )
    ).resolves.toBe(true);

    expect(database.publicationAttemptEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: PublicationAttemptEventType.UNKNOWN,
          terminal: true,
          operationKey: 'operation-1',
        }),
      })
    );
  });

  it('does not hide a projection failure outside the terminal transaction', async () => {
    const database = databaseDouble();
    database.publicationAttempt.findUniqueOrThrow.mockResolvedValue(attempt);
    database.publicationAttemptEvent.findFirst.mockResolvedValue(null);
    database.publicationAttemptEvent.create.mockResolvedValue({
      id: 'event-1',
    });
    database.post.update.mockRejectedValue(new Error('projection failed'));
    const service = new PublicationAttemptService(database as never);

    await expect(
      service.recordProviderResult('attempt-1', [
        {
          id: 'post-1',
          postId: 'platform-1',
          releaseURL: 'https://platform.test/1',
          status: 'success',
        },
      ])
    ).rejects.toThrow('projection failed');
    expect(database.$transaction).toHaveBeenCalledTimes(1);
  });
});
