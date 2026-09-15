import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { State } from '@gitroom/nestjs-libraries/database/prisma/generated/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

export type PostMetricUpsert = {
  organizationId: string;
  postId: string;
  integrationId: string;
  capturedDay: Date;
  impressions: number | null;
  reactions: number | null;
  comments: number | null;
  shares: number | null;
  raw?: Record<string, number>;
};

@Injectable()
export class PostMetricsRepository {
  constructor(
    private _snapshot: PrismaRepository<'postMetricSnapshot'>,
    private _post: PrismaRepository<'post'>,
    private _integration: PrismaRepository<'integration'>,
  ) {}

  listPublishedPostsForSync(integrationId: string, lookbackDays: number) {
    return this._post.model.post.findMany({
      where: {
        integrationId,
        deletedAt: null,
        parentPostId: null,
        state: State.PUBLISHED,
        releaseId: { not: null },
        NOT: { releaseId: 'missing' },
        publishDate: {
          gte: dayjs.utc().subtract(lookbackDays, 'day').toDate(),
        },
      },
      select: {
        id: true,
        releaseId: true,
        organizationId: true,
        integrationId: true,
      },
    });
  }

  listPublishedPostsForAnalytics(params: {
    organizationId: string;
    from: Date;
    to: Date;
    integrationIds?: string[];
  }) {
    return this._post.model.post.findMany({
      where: {
        organizationId: params.organizationId,
        deletedAt: null,
        parentPostId: null,
        state: State.PUBLISHED,
        releaseId: { not: null },
        NOT: { releaseId: 'missing' },
        publishDate: {
          gte: params.from,
          lte: params.to,
        },
        ...(params.integrationIds?.length
          ? { integrationId: { in: params.integrationIds } }
          : {}),
        integration: {
          deletedAt: null,
          disabled: false,
        },
      },
      select: {
        id: true,
        group: true,
        content: true,
        image: true,
        publishDate: true,
        releaseURL: true,
        releaseId: true,
        integrationId: true,
        integration: {
          select: {
            id: true,
            name: true,
            picture: true,
            providerIdentifier: true,
          },
        },
        postMetricSnapshots: {
          orderBy: { capturedAt: 'desc' },
          take: 2,
        },
      },
    });
  }

  listIntegrationsNeedingSync(
    lookbackDays: number,
    organizationId?: string,
    freshAfter?: Date
  ) {
    return this._post.model.post.findMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
        deletedAt: null,
        parentPostId: null,
        state: State.PUBLISHED,
        releaseId: { not: null },
        NOT: { releaseId: 'missing' },
        publishDate: {
          gte: dayjs.utc().subtract(lookbackDays, 'day').toDate(),
        },
        ...(freshAfter
          ? {
              postMetricSnapshots: {
                none: { capturedAt: { gte: freshAfter } },
              },
            }
          : {}),
        integration: {
          deletedAt: null,
          disabled: false,
          refreshNeeded: false,
          inBetweenSteps: false,
        },
      },
      distinct: ['organizationId', 'integrationId'],
      select: {
        organizationId: true,
        integrationId: true,
        integration: {
          select: {
            providerIdentifier: true,
          },
        },
      },
    });
  }

  listSnapshotsForPost(
    organizationId: string,
    postId: string,
    from: Date,
    to: Date,
  ) {
    return this._snapshot.model.postMetricSnapshot.findMany({
      where: {
        organizationId,
        postId,
        capturedDay: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { capturedDay: 'asc' },
      select: {
        capturedDay: true,
        impressions: true,
        reactions: true,
        comments: true,
        shares: true,
        raw: true,
      },
    });
  }

  getPostForAnalytics(organizationId: string, postId: string) {
    return this._post.model.post.findFirst({
      where: {
        id: postId,
        organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        group: true,
        content: true,
        image: true,
        publishDate: true,
        releaseURL: true,
        releaseId: true,
        state: true,
        integrationId: true,
        integration: {
          select: {
            id: true,
            name: true,
            picture: true,
            providerIdentifier: true,
          },
        },
        postMetricSnapshots: {
          orderBy: { capturedAt: 'desc' },
          take: 2,
        },
      },
    });
  }

  getIntegration(organizationId: string, integrationId: string) {
    return this._integration.model.integration.findFirst({
      where: {
        id: integrationId,
        organizationId,
        deletedAt: null,
      },
    });
  }

  upsertSnapshot(row: PostMetricUpsert) {
    return this._snapshot.model.postMetricSnapshot.upsert({
      where: {
        postId_capturedDay: {
          postId: row.postId,
          capturedDay: row.capturedDay,
        },
      },
      create: {
        organizationId: row.organizationId,
        postId: row.postId,
        integrationId: row.integrationId,
        capturedDay: row.capturedDay,
        impressions: row.impressions,
        reactions: row.reactions,
        comments: row.comments,
        shares: row.shares,
        raw: row.raw,
      },
      update: {
        impressions: row.impressions,
        reactions: row.reactions,
        comments: row.comments,
        shares: row.shares,
        raw: row.raw,
        capturedAt: new Date(),
      },
    });
  }
}
