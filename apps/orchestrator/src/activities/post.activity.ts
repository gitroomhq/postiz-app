import { Injectable } from '@nestjs/common';
import {
  Activity,
  ActivityMethod,
  TemporalService,
} from 'nestjs-temporal-core';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import {
  NotificationService,
  NotificationType,
} from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { Integration, Post, State } from '@prisma/client';
import { ApplicationFailure } from '@temporalio/activity';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import {
  AuthTokenDetails,
  PostResponse,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { RefreshIntegrationService } from '@gitroom/nestjs-libraries/integrations/refresh.integration.service';
import { timer } from '@gitroom/helpers/utils/timer';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { WebhooksService } from '@gitroom/nestjs-libraries/database/prisma/webhooks/webhooks.service';
import { TypedSearchAttributes } from '@temporalio/common';
import {
  organizationId,
  postId as postIdSearchParam,
} from '@gitroom/nestjs-libraries/temporal/temporal.search.attribute';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';

// Drops fields the workflow and downstream activities never read — biggest wins are `error` (grows per retry) and `childrenPost` (Prisma side-loads it on every recursive row).
function slimPost(post: any) {
  if (!post) return post;
  const {
    error,
    childrenPost,
    tags,
    description,
    title,
    submittedForOrderId,
    submittedForOrganizationId,
    submittedForOrder,
    submittedForOrganization,
    lastMessageId,
    parentPostId,
    approvedSubmitForOrder,
    deletedAt,
    createdAt,
    updatedAt,
    payoutProblems,
    comments,
    errors,
    ...rest
  } = post;
  return rest;
}

@Injectable()
@Activity()
export class PostActivity {
  constructor(
    private _postService: PostsService,
    private _notificationService: NotificationService,
    private _integrationManager: IntegrationManager,
    private _integrationService: IntegrationService,
    private _refreshIntegrationService: RefreshIntegrationService,
    private _webhookService: WebhooksService,
    private _temporalService: TemporalService,
    private _subscriptionService: SubscriptionService
  ) {}

  @ActivityMethod()
  async getIntegrationById(orgId: string, id: string) {
    return this._integrationService.getIntegrationById(orgId, id);
  }

  @ActivityMethod()
  async searchForMissingThreeHoursPosts() {
    const list = await this._postService.searchForMissingThreeHoursPosts();
    for (const post of list) {
      await this._temporalService.client
        .getRawClient()
        .workflow.signalWithStart('postWorkflowV105', {
          workflowId: `post_${post.id}`,
          taskQueue: 'main',
          signal: 'poke',
          workflowIdConflictPolicy: 'USE_EXISTING',
          signalArgs: [],
          args: [
            {
              taskQueue: post.integration.providerIdentifier
                .split('-')[0]
                .toLowerCase(),
              postId: post.id,
              organizationId: post.organizationId,
            },
          ],
          typedSearchAttributes: new TypedSearchAttributes([
            {
              key: postIdSearchParam,
              value: post.id,
            },
            {
              key: organizationId,
              value: post.organizationId,
            },
          ]),
        });
    }
  }

  @ActivityMethod()
  async updatePost(id: string, postId: string, releaseURL: string) {
    await this._postService.updatePost(id, postId, releaseURL);
  }

  @ActivityMethod()
  async getPost(orgId: string, postId: string) {
    if (process.env.STRIPE_SECRET_KEY) {
      const subscription = await this._subscriptionService.getSubscription(
        orgId
      );
      if (!subscription) {
        return false;
      }
    }
    const post = await this._postService.getPostById(postId, orgId);
    if (post.deletedAt) {
      return false;
    }

    return post;
  }

  @ActivityMethod()
  async getPostsList(orgId: string, postId: string) {
    if (process.env.STRIPE_SECRET_KEY) {
      const subscription = await this._subscriptionService.getSubscription(
        orgId
      );
      if (!subscription) {
        return [];
      }
    }

    const getPosts = await this._postService.getPostsRecursively(
      postId,
      true,
      orgId
    );
    if (!getPosts || getPosts.length === 0 || getPosts[0].parentPostId) {
      return [];
    }

    return getPosts.map(slimPost);
  }

  @ActivityMethod()
  async isCommentable(integration: Integration) {
    const getIntegration = this._integrationManager.getSocialIntegration(
      integration.providerIdentifier
    );

    return !!getIntegration.comment;
  }

  @ActivityMethod()
  async postComment(
    postId: string,
    lastPostId: string | undefined,
    integration: Integration,
    posts: Post[]
  ) {
    const getIntegration = this._integrationManager.getSocialIntegration(
      integration.providerIdentifier
    );

    const newPosts = await this._postService.updateTags(
      integration.organizationId,
      posts
    );

    return getIntegration.comment(
      integration.internalId,
      postId,
      lastPostId,
      integration.token,
      await Promise.all(
        (newPosts || []).map(async (p) => ({
          id: p.id,
          message: stripHtmlValidation(
            getIntegration.editor,
            p.content,
            true,
            false,
            !/<\/?[a-z][\s\S]*>/i.test(p.content),
            getIntegration.mentionFormat
          ),
          settings: JSON.parse(p.settings || '{}'),
          media: await this._postService.updateMedia(
            p.id,
            JSON.parse(p.image || '[]'),
            getIntegration?.convertToJPEG || false
          ),
        }))
      ),
      integration
    );
  }

  @ActivityMethod()
  async releaseStaleClaims(olderThanMinutes = 120) {
    // VOC-43: cleanup of orphan posting claims (claimed but never released and
    // still unpublished). No-op unless the feature is enabled.
    if (process.env.IDEMPOTENT_POSTING !== 'true') {
      return;
    }
    await this._postService.releaseStaleClaims(olderThanMinutes);
  }

  @ActivityMethod()
  async releasePostingClaim(id: string) {
    // VOC-43: no-op when the feature is off, so the workflow can call this
    // unconditionally (deterministic command sequence) without any DB effect.
    if (process.env.IDEMPOTENT_POSTING !== 'true') {
      return;
    }
    await this._postService.releasePostingClaim(id);
  }

  @ActivityMethod()
  async postSocial(integration: Integration, posts: Post[]) {
    if (process.env.STRIPE_SECRET_KEY) {
      const subscription = await this._subscriptionService.getSubscription(
        integration.organizationId
      );

      if (!subscription) {
        throw new Error('No active subscription found for this organization.');
      }
    }

    // VOC-43: idempotent posting (behind feature flag). Prevents a double-post
    // when Temporal retries an activity that already executed the real POST but
    // crashed before the workflow could persist the result.
    const idempotentPosting = process.env.IDEMPOTENT_POSTING === 'true';
    if (idempotentPosting) {
      const mainPostId = posts?.[0]?.id;
      if (mainPostId) {
        // Authoritative read of the current DB state for this post.
        const current = await this._postService.getPostById(
          mainPostId,
          integration.organizationId
        );

        // Already posted to the social channel — short-circuit and rebuild the
        // existing result WITHOUT reposting.
        if (current && current.releaseId && current.releaseId !== 'missing') {
          return [
            {
              id: current.id,
              postId: current.releaseId,
              releaseURL: current.releaseURL || '',
              status: 'success',
            },
          ] as PostResponse[];
        }

        // Not yet posted — try to acquire the posting claim atomically.
        const claimed = await this._postService.claimPosting(mainPostId);
        if (claimed === 0) {
          // Could not claim AND there is no releaseId: ambiguous state where the
          // post may already be in flight. Prefer NOT posting over duplicating.
          throw ApplicationFailure.nonRetryable(
            'Posting already claimed for this post; refusing to repost to avoid duplicates.',
            'posting_claim_conflict'
          );
        }
        // claimed === 1 → we own the claim, proceed to the real post.
      }
    }

    const getIntegration = this._integrationManager.getSocialIntegration(
      integration.providerIdentifier
    );

    const newPosts = await this._postService.updateTags(
      integration.organizationId,
      posts
    );

    const postNow = await getIntegration.post(
      integration.internalId,
      integration.token,
      await Promise.all(
        (newPosts || []).map(async (p) => ({
          id: p.id,
          message: stripHtmlValidation(
            getIntegration.editor,
            p.content,
            true,
            false,
            !/<\/?[a-z][\s\S]*>/i.test(p.content),
            getIntegration.mentionFormat
          ),
          settings: JSON.parse(p.settings || '{}'),
          media: await this._postService.updateMedia(
            p.id,
            JSON.parse(p.image || '[]'),
            getIntegration?.convertToJPEG || false
          ),
        }))
      ),
      integration
    );

    // VOC-43: best-effort. The real post already happened above; a failure here
    // must NOT trigger a Temporal retry of this activity (that would double-post).
    try {
      await this._temporalService.client
        .getRawClient()
        .workflow.start('streakWorkflow', {
          args: [{ organizationId: integration.organizationId }],
          workflowId: `streak_${integration.organizationId}`,
          taskQueue: 'main',
          workflowIdConflictPolicy: 'TERMINATE_EXISTING',
          typedSearchAttributes: new TypedSearchAttributes([
            {
              key: organizationId,
              value: integration.organizationId,
            },
          ]),
        });
    } catch (err) {
      console.error('Failed to start streakWorkflow (non-fatal):', err);
    }

    return postNow;
  }

  @ActivityMethod()
  async inAppNotification(
    orgId: string,
    subject: string,
    message: string,
    sendEmail = false,
    digest = false,
    type: NotificationType = 'success'
  ) {
    await this._notificationService.inAppNotification(
      orgId,
      subject,
      message,
      sendEmail,
      digest,
      type
    );
  }

  @ActivityMethod()
  async globalPlugs(integration: Integration) {
    return this._postService.checkPlugs(
      integration.organizationId,
      integration.providerIdentifier,
      integration.id
    );
  }

  @ActivityMethod()
  async changeState(id: string, state: State, err?: any, body?: any) {
    await this._postService.changeState(id, state, err, body);
  }

  @ActivityMethod()
  async internalPlugs(integration: Integration, settings: any) {
    return this._postService.checkInternalPlug(
      integration,
      integration.organizationId,
      integration.id,
      settings
    );
  }

  @ActivityMethod()
  async sendWebhooks(postId: string, orgId: string, integrationId: string) {
    const webhooks = (await this._webhookService.getWebhooks(orgId)).filter(
      (f) => {
        return (
          f.integrations.length === 0 ||
          f.integrations.some((i) => i.integration.id === integrationId)
        );
      }
    );

    const post = await this._postService.getPostByForWebhookId(postId);
    await Promise.all(
      webhooks.map(async (webhook) => {
        try {
          await fetch(webhook.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(post),
          });
        } catch (e) {
          /**empty**/
        }
      })
    );
  }
  @ActivityMethod()
  async processPlug(data: {
    plugId: string;
    postId: string;
    delay: number;
    totalRuns: number;
    currentRun: number;
  }) {
    return this._integrationService.processPlugs(data);
  }

  @ActivityMethod()
  async processInternalPlug(data: {
    post: string;
    originalIntegration: string;
    integration: string;
    plugName: string;
    orgId: string;
    delay: number;
    information: any;
  }) {
    await this._integrationService.processInternalPlug(data);
  }

  @ActivityMethod()
  async refreshToken(
    integration: Integration
  ): Promise<false | AuthTokenDetails> {
    const getIntegration = this._integrationManager.getSocialIntegration(
      integration.providerIdentifier
    );

    try {
      const refresh = await this._refreshIntegrationService.refresh(
        integration
      );
      if (!refresh) {
        return false;
      }

      if (getIntegration.refreshWait) {
        await timer(10000);
      }

      return refresh;
    } catch (err) {
      await this._refreshIntegrationService.setBetweenSteps(integration);
      return false;
    }
  }

  @ActivityMethod()
  async refreshTokenWithCause(
    integration: Integration,
    cause: string
  ): Promise<false | AuthTokenDetails> {
    const getIntegration = this._integrationManager.getSocialIntegration(
      integration.providerIdentifier
    );

    try {
      const refresh = await this._refreshIntegrationService.refresh(
        integration,
        cause
      );
      if (!refresh) {
        return false;
      }

      if (getIntegration.refreshWait) {
        await timer(10000);
      }

      return refresh;
    } catch (err) {
      await this._refreshIntegrationService.setBetweenSteps(integration, cause);
      return false;
    }
  }
}
