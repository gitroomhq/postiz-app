import { Injectable, Optional } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { TemporalService } from 'nestjs-temporal-core';

type ReviewStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'REVOKED';
type ReviewEventType =
  | 'CREATED'
  | 'VIEWED'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'REVOKED'
  | 'INVALID_ATTEMPT'
  | 'REMINDER_SENT';

type ReviewActor = {
  ip?: string;
  userAgent?: string;
  reviewerName?: string;
  reviewerEmail?: string;
};

type ReviewEvent = {
  type: ReviewEventType;
  at: string;
  actor?: ReviewActor;
  details?: string;
};

type ReviewTokenPayload = {
  id: string;
  postId: string;
  organizationId: string;
  status: ReviewStatus;
  expiresAt: string;
  createdAt: string;
  decidedAt?: string;
  feedback?: string;
  events?: ReviewEvent[];
};

const REVIEW_KEY = 'review:token:';
const REVIEW_POST_ACTIVE_KEY = 'review:post:';

@Injectable()
export class ReviewService {
  constructor(
    private _postsService: PostsService,
    private _prisma: PrismaService,
    private _notificationService: NotificationService,
    @Optional()
    private _temporalService?: TemporalService
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getKeyFromToken(token: string): string {
    return `${REVIEW_KEY}${this.hashToken(token)}`;
  }

  private getStorageKeyFromHash(hash: string): string {
    return `${REVIEW_KEY}${hash}`;
  }

  private getActivePostKey(orgId: string, postId: string): string {
    return `${REVIEW_POST_ACTIVE_KEY}${orgId}:${postId}`;
  }

  private isExpired(expiresAt: string) {
    return new Date(expiresAt).getTime() <= Date.now();
  }

  private pushEvent(
    payload: ReviewTokenPayload,
    type: ReviewEventType,
    actor?: ReviewActor,
    details?: string
  ) {
    return {
      ...payload,
      events: [
        ...(payload.events || []),
        {
          type,
          at: new Date().toISOString(),
          ...(actor ? { actor } : {}),
          ...(details ? { details } : {}),
        },
      ],
    };
  }

  private async incrementWithTtl(key: string, ttlSeconds: number) {
    const redisAny = ioRedis as any;
    if (typeof redisAny.incr === 'function') {
      const count = await redisAny.incr(key);
      if (count === 1 && typeof redisAny.expire === 'function') {
        await redisAny.expire(key, ttlSeconds);
      }
      return count;
    }
    const current = Number((await ioRedis.get(key)) || 0) || 0;
    const next = current + 1;
    await ioRedis.set(key, String(next), 'EX', ttlSeconds);
    return next;
  }

  private async checkRateLimit(
    namespace: string,
    id: string,
    actor?: ReviewActor,
    max = 30,
    ttlSeconds = 60 * 15
  ) {
    const ip = actor?.ip || 'unknown';
    const key = `review:rate:${namespace}:${id}:${ip}`;
    const count = await this.incrementWithTtl(key, ttlSeconds);
    return count <= max;
  }

  private async applyDecisionEffects(
    payload: ReviewTokenPayload,
    status: ReviewStatus,
    feedback?: string,
    actor?: ReviewActor
  ) {
    const rootPost = await this._prisma.post.findUnique({
      where: {
        id: payload.postId,
        organizationId: payload.organizationId,
      },
      select: {
        id: true,
        group: true,
      },
    });

    if (!rootPost) {
      return;
    }

    if (status === 'REJECTED' || status === 'EXPIRED') {
      await this._prisma.post.updateMany({
        where: {
          organizationId: payload.organizationId,
          group: rootPost.group,
          deletedAt: null,
        },
        data: {
          state: 'DRAFT',
        },
      });
    }

    const orgUser = await this._prisma.userOrganization.findFirst({
      where: {
        organizationId: payload.organizationId,
        disabled: false,
      },
      select: {
        userId: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const reviewerIdentity = actor?.reviewerName?.trim()
      ? `${actor.reviewerName.trim()}${
          actor?.reviewerEmail?.trim() ? ` <${actor.reviewerEmail.trim()}>` : ''
        }`
      : '';

    if (orgUser) {
      const content =
        status === 'APPROVED'
          ? `[External Review] Post approved${
              reviewerIdentity ? ` by ${reviewerIdentity}` : ''
            }`
          : status === 'REJECTED'
          ? `[External Review] Post rejected${
              reviewerIdentity ? ` by ${reviewerIdentity}` : ''
            }${
              feedback?.trim() ? `: ${feedback.trim()}` : ''
            }`
          : '[External Review] Link expired before approval';
      await this._prisma.comments.create({
        data: {
          organizationId: payload.organizationId,
          userId: orgUser.userId,
          postId: payload.postId,
          content,
        },
      });
    }

    const subject =
      status === 'APPROVED'
        ? 'External review approved'
        : status === 'REJECTED'
        ? 'External review rejected'
        : 'External review expired';
    const message =
      status === 'REJECTED'
        ? `Post review was rejected${
            reviewerIdentity ? ` by ${reviewerIdentity}` : ''
          }.${feedback?.trim() ? ` Feedback: ${feedback.trim()}` : ''}`
        : status === 'APPROVED'
        ? `Post review was approved${
            reviewerIdentity ? ` by ${reviewerIdentity}` : ''
          }.`
        : 'Post review expired before a decision.';

    await this._notificationService.inAppNotification(
      payload.organizationId,
      subject,
      message,
      false,
      false,
      'info'
    );
  }

  private sanitizePosts(posts: any[]) {
    return posts.map(({ childrenPost, ...post }) => ({
      ...post,
      ...(post.integration
        ? {
            integration: {
              id: post.integration.id,
              name: post.integration.name,
              picture: post.integration.picture,
              providerIdentifier: post.integration.providerIdentifier,
              profile: post.integration.profile,
            },
          }
        : {}),
    }));
  }

  private mapDbToken(dbToken: any): ReviewTokenPayload {
    return {
      id: dbToken.tokenHash,
      postId: dbToken.postId,
      organizationId: dbToken.organizationId,
      status: dbToken.status as ReviewStatus,
      expiresAt: new Date(dbToken.expiresAt).toISOString(),
      createdAt: new Date(dbToken.createdAt).toISOString(),
      ...(dbToken.decidedAt
        ? { decidedAt: new Date(dbToken.decidedAt).toISOString() }
        : {}),
      ...(dbToken.feedback ? { feedback: dbToken.feedback } : {}),
      events: (dbToken.events || []).map((event: any) => ({
        type: event.type as ReviewEventType,
        at: new Date(event.createdAt).toISOString(),
        ...(event.actor ? { actor: event.actor as ReviewActor } : {}),
        ...(event.details ? { details: event.details } : {}),
      })),
    };
  }

  private async getDbTokenByHash(tokenHash: string) {
    return this._prisma.reviewToken.findUnique({
      where: {
        tokenHash,
      },
      include: {
        events: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
  }

  private async appendEvent(
    reviewTokenId: string,
    type: ReviewEventType,
    actor?: ReviewActor,
    details?: string
  ) {
    await this._prisma.reviewEvent.create({
      data: {
        reviewTokenId,
        type,
        ...(actor ? { actor: actor as any } : {}),
        ...(details ? { details } : {}),
      },
    });
  }

  private async signalWorkflowResolved(
    tokenHash: string,
    status: 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'REVOKED'
  ) {
    try {
      const handle = await this._temporalService?.client?.getWorkflowHandle(
        `external_review_${tokenHash}`
      );
      await (handle as any)?.signal?.('externalReviewResolved', { status });
    } catch (e) {
      // Signaling should not fail the API operation.
    }
  }

  async createReviewLink(orgId: string, postId: string) {
    const posts = await this._postsService.getPostsRecursively(
      postId,
      true,
      orgId,
      true
    );

    if (!posts.length) {
      return null;
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const activePostKey = this.getActivePostKey(orgId, postId);

    const previousPending = await this._prisma.reviewToken.findFirst({
      where: {
        organizationId: orgId,
        postId,
        status: 'PENDING',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (previousPending) {
      await this._prisma.reviewToken.update({
        where: {
          id: previousPending.id,
        },
        data: {
          status: 'REVOKED',
          decidedAt: new Date(),
        },
      });
      await this.appendEvent(previousPending.id, 'REVOKED');
      await this.signalWorkflowResolved(previousPending.tokenHash, 'REVOKED');
    }

    const firstPost = posts[0];
    const scheduledAt = firstPost?.publishDate
      ? new Date(firstPost.publishDate)
      : new Date();
    const expiresAt = new Date(scheduledAt.getTime() + 1000 * 60 * 60 * 24 * 7);

    const created = await this._prisma.reviewToken.create({
      data: {
        organizationId: orgId,
        postId,
        tokenHash,
        status: 'PENDING',
        expiresAt,
      },
    });
    await this.appendEvent(created.id, 'CREATED');

    const payload: ReviewTokenPayload = {
      id: tokenHash,
      postId,
      organizationId: orgId,
      status: 'PENDING',
      createdAt: new Date(created.createdAt).toISOString(),
      expiresAt: new Date(created.expiresAt).toISOString(),
      events: [{ type: 'CREATED', at: new Date().toISOString() }],
    };

    await ioRedis.set(
      this.getStorageKeyFromHash(tokenHash),
      JSON.stringify(payload),
      'EX',
      60 * 60 * 24 * 14
    );
    await ioRedis.set(activePostKey, tokenHash, 'EX', 60 * 60 * 24 * 14);

    const scheduledAtDate = firstPost?.publishDate
      ? new Date(firstPost.publishDate)
      : null;
    const reminderAt = scheduledAtDate
      ? new Date(scheduledAtDate.getTime() - 2 * 60 * 60 * 1000)
      : null;
    const reminderDelayMs = reminderAt
      ? Math.max(0, reminderAt.getTime() - Date.now())
      : 0;
    const expiryDelayMs = Math.max(
      0,
      new Date(payload.expiresAt).getTime() - Date.now()
    );

    try {
      await this._temporalService?.client
        ?.getRawClient()
        ?.workflow.start('externalReviewWorkflow', {
          args: [
            {
              token,
              reminderDelayMs,
              expiryDelayMs,
            },
          ],
          workflowId: `external_review_${tokenHash}`,
          taskQueue: 'main',
          workflowIdConflictPolicy: 'TERMINATE_EXISTING',
        });
    } catch (e) {
      // Link generation must not fail if Temporal is unavailable.
    }

    return {
      token,
      expiresAt: payload.expiresAt,
      status: payload.status,
      scheduledAt: firstPost?.publishDate || null,
      url: `${process.env.FRONTEND_URL}/share/${token}`,
    };
  }

  async getTokenPayload(token: string): Promise<ReviewTokenPayload | null> {
    const tokenHash = this.hashToken(token);
    const dbToken = await this.getDbTokenByHash(tokenHash);
    if (!dbToken) {
      return null;
    }

    const parsed = this.mapDbToken(dbToken);
    if (parsed.status !== 'PENDING') {
      return parsed;
    }

    if (parsed.status === 'PENDING' && this.isExpired(parsed.expiresAt)) {
      await this._prisma.reviewToken.update({
        where: {
          id: dbToken.id,
        },
        data: {
          status: 'EXPIRED',
          decidedAt: new Date(),
        },
      });
      await this.appendEvent(dbToken.id, 'EXPIRED');
      const updated = await this.getDbTokenByHash(tokenHash);
      if (!updated) {
        return null;
      }
      const expired = this.mapDbToken(updated);
      await this.applyDecisionEffects(expired, 'EXPIRED');
      await this.signalWorkflowResolved(tokenHash, 'EXPIRED');
      return expired;
    }

    return parsed;
  }

  async getReviewByToken(token: string, actor?: ReviewActor) {
    const payload = await this.getTokenPayload(token);
    if (!payload) {
      return null;
    }

    if (!(await this.checkRateLimit('view', payload.id, actor, 120, 60 * 15))) {
      return null;
    }

    const posts = await this._postsService.getPostsRecursively(
      payload.postId,
      true,
      payload.organizationId,
      true
    );

    if (!posts.length) {
      return null;
    }

    const sanitized = this.sanitizePosts(posts);
    const dbToken = await this.getDbTokenByHash(payload.id);
    if (dbToken) {
      await this.appendEvent(dbToken.id, 'VIEWED', actor);
    }

    return {
      status: payload.status,
      expiresAt: payload.expiresAt,
      scheduledAt: sanitized[0]?.publishDate || null,
      feedback: payload.feedback,
      posts: sanitized,
    };
  }

  async revokeActiveReview(orgId: string, postId: string) {
    const pending = await this._prisma.reviewToken.findFirst({
      where: {
        organizationId: orgId,
        postId,
        status: 'PENDING',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!pending) {
      return {
        ok: false as const,
        code: 404,
        message: 'No active review link found',
      };
    }

    await this._prisma.reviewToken.update({
      where: {
        id: pending.id,
      },
      data: {
        status: 'REVOKED',
        decidedAt: new Date(),
      },
    });
    await this.appendEvent(pending.id, 'REVOKED');
    await this.signalWorkflowResolved(pending.tokenHash, 'REVOKED');
    await ioRedis.del(this.getActivePostKey(orgId, postId));
    return { ok: true as const, code: 200, status: 'REVOKED' as const };
  }

  async sendReminderIfPending(token: string) {
    const payload = await this.getTokenPayload(token);
    if (!payload || payload.status !== 'PENDING') {
      return { ok: false as const, skipped: true as const };
    }

    const dbToken = await this.getDbTokenByHash(payload.id);
    if (dbToken) {
      await this.appendEvent(dbToken.id, 'REMINDER_SENT');
    }

    await this._notificationService.inAppNotification(
      payload.organizationId,
      'External review reminder',
      'A shared post is still pending external approval.',
      false,
      false,
      'info'
    );

    return { ok: true as const, skipped: false as const };
  }

  async expireIfPending(token: string) {
    const payload = await this.getTokenPayload(token);
    if (!payload || payload.status !== 'PENDING') {
      return { ok: false as const, skipped: true as const };
    }

    const dbToken = await this.getDbTokenByHash(payload.id);
    if (!dbToken) {
      return { ok: false as const, skipped: true as const };
    }

    await this._prisma.reviewToken.update({
      where: {
        id: dbToken.id,
      },
      data: {
        status: 'EXPIRED',
        decidedAt: new Date(),
      },
    });
    await this.appendEvent(dbToken.id, 'EXPIRED');
    const updated = await this.getDbTokenByHash(payload.id);
    if (updated) {
      await this.applyDecisionEffects(this.mapDbToken(updated), 'EXPIRED');
      await this.signalWorkflowResolved(updated.tokenHash, 'EXPIRED');
      await ioRedis.del(
        this.getActivePostKey(updated.organizationId, updated.postId)
      );
    }
    return { ok: true as const, skipped: false as const };
  }

  async decide(
    token: string,
    decision: 'approve' | 'reject',
    feedback?: string,
    actor?: ReviewActor
  ) {
    const payload = await this.getTokenPayload(token);

    const tokenHash = this.hashToken(token);
    const withinLimit = await this.checkRateLimit('decide', tokenHash, actor, 20, 60 * 10);
    if (!withinLimit) {
      return {
        ok: false as const,
        code: 429,
        message: 'Too many attempts. Please try again shortly.',
      };
    }

    if (!payload) {
      await this.incrementWithTtl(
        `review:invalid:${actor?.ip || 'unknown'}`,
        60 * 15
      );
      return { ok: false as const, code: 404, message: 'Review token not found' };
    }

    if (payload.status !== 'PENDING') {
      return {
        ok: false as const,
        code: 409,
        message: `Review is already ${payload.status.toLowerCase()}`,
        status: payload.status,
      };
    }

    const status: ReviewStatus = decision === 'approve' ? 'APPROVED' : 'REJECTED';
    const updated = await this._prisma.reviewToken.updateMany({
      where: {
        tokenHash,
        status: 'PENDING',
      },
      data: {
        status,
        feedback: decision === 'reject' ? feedback || '' : null,
        decidedAt: new Date(),
      },
    });
    if (!updated.count) {
      const latest = await this.getTokenPayload(token);
      return {
        ok: false as const,
        code: 409,
        message: `Review is already ${latest?.status?.toLowerCase?.() || 'closed'}`,
        status: latest?.status,
      };
    }

    const dbToken = await this.getDbTokenByHash(tokenHash);
    if (!dbToken) {
      return { ok: false as const, code: 404, message: 'Review token not found' };
    }
    await this.appendEvent(
      dbToken.id,
      decision === 'approve' ? 'APPROVED' : 'REJECTED',
      actor
    );
    const updatedToken = await this.getDbTokenByHash(tokenHash);
    if (!updatedToken) {
      return { ok: false as const, code: 404, message: 'Review token not found' };
    }
    const nextPayload = this.mapDbToken(updatedToken);

    await this.applyDecisionEffects(
      nextPayload,
      status,
      nextPayload.feedback,
      actor
    );
    await this.signalWorkflowResolved(
      tokenHash,
      status === 'APPROVED' ? 'APPROVED' : 'REJECTED'
    );
    await ioRedis.del(this.getActivePostKey(payload.organizationId, payload.postId));

    return {
      ok: true as const,
      code: 200,
      status: nextPayload.status,
      feedback: nextPayload.feedback,
    };
  }
}
