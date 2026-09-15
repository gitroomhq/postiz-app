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
import { Integration, Post, State } from '@gitroom/nestjs-libraries/database/prisma/generated/client';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { AuthTokenDetails } from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { RefreshIntegrationService } from '@gitroom/nestjs-libraries/integrations/refresh.integration.service';
import { timer } from '@gitroom/helpers/utils/timer';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { WebhooksService } from '@gitroom/nestjs-libraries/database/prisma/webhooks/webhooks.service';
import { getSsrfSafeDispatcher } from '@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher';
import { TypedSearchAttributes } from '@temporalio/common';
import { WorkflowNotFoundError } from '@temporalio/client';
import {
  organizationId,
  postId as postIdSearchParam,
} from '@gitroom/nestjs-libraries/temporal/temporal.search.attribute';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import {
  setHeartbeatDetails,
  withHeartbeat,
} from '@gitroom/nestjs-libraries/temporal/temporal.heartbeat';
import {
  BadBody,
  Disconnect,
} from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { isBillingEnabled } from '@gitroom/helpers/utils/billing.enabled';
import { extractPostErrorMessage } from '@gitroom/helpers/utils/post.error.message';

/**
 * Written to `Post.error` when a scheduled post could not run because the org
 * has no active subscription. Deliberately not 'No Post': that string is a
 * silence sentinel, and it is what the frozen workflow writes for this case.
 * Rendered into the calendar tooltip, so it reads as a sentence fragment.
 */
const LAPSED_SUBSCRIPTION = 'Subscription required';

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

// A genuinely missed occurrence (dead workflow) is only recovered by the
// missing-posts sweep, which runs every hour - so anything later than the
// sweep period plus retry margin is a stale anchor, not a missed publish.
const REANCHOR_GRACE_MS = 2 * 60 * 60 * 1000;

// A repeat post keeps its original anchor publishDate forever (updatePost only
// flips the state, the calendar expands occurrences virtually). If the workflow
// gets that raw past date, any (re)start - an accidental edit resetting the
// state to QUEUE, or a missing-posts sweep poke - sleeps 0 and publishes
// instantly, machine-gunning the channel. Roll the returned date forward to the
// next occurrence on the anchor grid instead, so fresh starts wait for the next
// real occurrence. Only for the initial QUEUE run: repeat chain children
// (postNow) run against a PUBLISHED post and must keep publishing immediately.
// Occurrences missed within the grace window still catch up and post.
function reanchorInterval(post: any) {
  if (!post?.intervalInDays || post.state !== State.QUEUE) {
    return post;
  }

  const interval = post.intervalInDays * 24 * 60 * 60 * 1000;
  const late = Date.now() - new Date(post.publishDate).getTime();
  if (late <= REANCHOR_GRACE_MS) {
    return post;
  }

  const next =
    new Date(post.publishDate).getTime() +
    Math.ceil(late / interval) * interval;

  return { ...post, publishDate: new Date(next) };
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
      // v109, matching posts.service.ts. The recovery sweep starting an older
      // version would have quietly reintroduced the duplicate-publish loop on
      // exactly the posts that had already gone wrong once.
      await this._temporalService.client
        .getRawClient()
        .workflow.signalWithStart('postWorkflowV109', {
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

  // Taken by post workflow v1.0.9 before it acts on a post: only the run that
  // holds the claim publishes it or changes its state. `claimant` is
  // "<workflowId>/<runId>". Retrying is safe, the holder gets it again.
  @ActivityMethod()
  async claimPost(
    postId: string,
    claimant: string,
    postNow = false
  ): Promise<'claimed' | 'gone' | 'not-queued' | 'busy' | 'orphaned'> {
    if (await this._postService.claimPost(postId, claimant, postNow)) {
      return 'claimed';
    }

    const post = await this._postService.getPublishClaim(postId);
    if (!post || post.deletedAt) {
      return 'gone';
    }

    // Published, failed or drafted in the meantime: nothing to publish.
    if (!postNow && post.state !== 'QUEUE') {
      return 'not-queued';
    }

    if (!post.publishClaim) {
      // Neither condition that makes the write miss holds any more, so it
      // lost a race with another write. The activity's own retry settles it.
      throw new Error(`Could not claim post ${postId}`);
    }

    // Held by another run. Still going: leave the post to it. Gone — the
    // usual way is an edit terminating it mid-publish — means nobody knows
    // whether it reached the platform, which the workflow reports instead of
    // publishing a second time.
    const [workflowId, runId] = post.publishClaim.split('/');
    try {
      const { status } = await this._temporalService.client
        .getRawClient()
        .workflow.getHandle(workflowId, runId)
        .describe();
      return status.name === 'RUNNING' ? 'busy' : 'orphaned';
    } catch (err) {
      // Past the namespace's retention, so long finished.
      if (err instanceof WorkflowNotFoundError) {
        return 'orphaned';
      }
      throw err;
    }
  }

  @ActivityMethod()
  async updatePost(id: string, postId: string, releaseURL: string) {
    await this._postService.updatePost(id, postId, releaseURL);
  }

  @ActivityMethod()
  async getPost(orgId: string, postId: string) {
    if (isBillingEnabled()) {
      const subscription = await this._subscriptionService.getSubscription(
        orgId
      );
      if (!subscription) {
        return false;
      }
    }
    const post = await this._postService.getPostById(postId, orgId);
    // `getPostById` returns null when the row is gone outright, or when it no
    // longer belongs to this organization. That is the same answer as a soft
    // delete for this activity's purposes — there is nothing to publish — but
    // reading `deletedAt` off it threw instead, and a throwing activity is one
    // Temporal retries forever rather than a workflow that finishes.
    if (!post || post.deletedAt) {
      return false;
    }

    return reanchorInterval(post);
  }

  @ActivityMethod()
  async getPostsList(orgId: string, postId: string) {
    if (isBillingEnabled()) {
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

    // only the root drives the pre-publish sleep and the repeat schedule,
    // the rest are comments
    const [root, ...comments] = getPosts.map(slimPost);
    return [reanchorInterval(root), ...comments];
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
    // the whole body runs under the workflow's heartbeatTimeout (media
    // conversion and the platform call can both take minutes), so it
    // heartbeats end to end - under older workflow versions that set no
    // heartbeatTimeout this is a no-op
    return withHeartbeat(() =>
      this.handleDisconnect(integration, async () => {
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
      })
    );
  }

  @ActivityMethod()
  async postSocial(integration: Integration, posts: Post[]) {
    return this.postSocialInternal(integration, posts, false);
  }

  // Used by postWorkflowV107 and up: providers that implement `postPending`
  // return a `pending` response the workflow resolves via checkPostStatus /
  // finalizePost. Older workflow versions keep calling `postSocial` and get
  // the old blocking behaviour.
  @ActivityMethod()
  async postSocialPending(integration: Integration, posts: Post[]) {
    return this.postSocialInternal(integration, posts, true);
  }

  // A Disconnect error means the platform will keep rejecting this channel no
  // matter how many token refreshes (e.g. TikTok's daily active user cap):
  // mark the channel as needing a re-connect and notify the user, then rethrow
  // as BadBody so every workflow version - frozen once on main - treats it as
  // a terminal error without needing a new workflow.
  private async handleDisconnect<T>(
    integration: Integration,
    func: () => Promise<T>
  ): Promise<T> {
    try {
      return await func();
    } catch (err) {
      if (err instanceof Disconnect) {
        try {
          await this._integrationService.disconnectChannel(
            integration.organizationId,
            integration,
            err.message
          );
        } catch (e) {
          /**empty**/
        }

        throw new BadBody(
          integration.providerIdentifier,
          JSON.stringify({}),
          Buffer.from('{}'),
          err.message
        );
      }

      throw err;
    }
  }

  private async postSocialInternal(
    integration: Integration,
    posts: Post[],
    allowPending: boolean
  ) {
    // the whole body runs under the workflow's heartbeatTimeout (media
    // conversion and the platform call can both take minutes), so it
    // heartbeats end to end - under older workflow versions that set no
    // heartbeatTimeout this is a no-op
    return withHeartbeat(() =>
      this.handleDisconnect(integration, () =>
        this.postSocialBody(integration, posts, allowPending)
      )
    );
  }

  private async postSocialBody(
    integration: Integration,
    posts: Post[],
    allowPending: boolean
  ) {
    // Stage markers: whatever ran last is what a timed-out activity reports.
    // Providers that go through this.fetch overwrite these with the exact URL;
    // the ones on their own HTTP client (x, youtube, bluesky) are still
    // narrowed down to the step they hung on.
    setHeartbeatDetails('subscription lookup');
    // `isBillingEnabled()` rather than upstream's bare STRIPE_SECRET_KEY: a
    // secret key with no publishable key is a half-configured install, and
    // treating it as "billing on" made the worker refuse every scheduled post.
    if (isBillingEnabled()) {
      const subscription = await this._subscriptionService.getSubscription(
        integration.organizationId
      );

      if (!subscription) {
        throw new Error('No active subscription found for this organization.');
      }
    }

    const getIntegration = this._integrationManager.getSocialIntegration(
      integration.providerIdentifier
    );

    setHeartbeatDetails('update tags');
    const newPosts = await this._postService.updateTags(
      integration.organizationId,
      posts
    );

    setHeartbeatDetails('resolve media');
    const mappedPosts = await Promise.all(
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
    );

    setHeartbeatDetails(`${integration.providerIdentifier}: publish`);
    const postNow =
      allowPending && getIntegration.postPending
        ? await getIntegration.postPending(
            integration.internalId,
            integration.token,
            mappedPosts,
            integration
          )
        : await getIntegration.post(
            integration.internalId,
            integration.token,
            mappedPosts,
            integration
          );

    // Everything past this point runs *after* the post is live on the
    // customer's timeline, so nothing here may fail the activity. Temporal
    // retries a failed activity, and a retry of this one publishes the post a
    // second time. A streak counter is not worth a duplicate post, so its
    // failure is swallowed deliberately.
    setHeartbeatDetails(`${integration.providerIdentifier}: published, streak`);
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
      console.error(
        `[postSocial] post ${newPosts?.[0]?.id} published, but the streak workflow could not start`,
        err
      );
    }

    return postNow;
  }

  @ActivityMethod()
  async checkPostStatus(integration: Integration, pendingData: any) {
    const getIntegration = this._integrationManager.getSocialIntegration(
      integration.providerIdentifier
    );

    return this.handleDisconnect(integration, () =>
      getIntegration.checkPostStatus(integration.token, pendingData, integration)
    );
  }

  @ActivityMethod()
  async finalizePost(integration: Integration, pendingData: any) {
    const getIntegration = this._integrationManager.getSocialIntegration(
      integration.providerIdentifier
    );

    return withHeartbeat(() =>
      this.handleDisconnect(integration, () =>
        getIntegration.finalizePost(integration.token, pendingData, integration)
      )
    );
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
    // Read BEFORE the write: the post already being in ERROR is how we know
    // this is a repeat. The generic-error branch in post.workflow v1.0.5 does
    // not break out of its 5-iteration retry loop, and this activity itself
    // retries 3 times, so one failed post could otherwise send 15 notifications
    // and 15 emails. The workflow file is frozen, so it is deduped here.
    const [before] =
      state !== 'ERROR'
        ? []
        : await this._postService
            .getPostsRecursively(id, true)
            .catch(() => [] as any[]);

    // `getPost` and `getPostsList` return falsy both for a post that is gone
    // and for an org whose subscription has lapsed, and the frozen workflow
    // turns either into 'No Post' — which is on the silence list below. So a
    // paying customer who let their plan expire lost every scheduled post
    // without a word, and the hourly sweep never picked them up again because
    // it only collects `QUEUE`. Ask the subscription rather than inferring it
    // from the row: this only runs on the 'No Post' path, and guessing wrong
    // either way is a lost post or a false alarm.
    let reason = extractPostErrorMessage(err);
    const lapsed =
      state === 'ERROR' &&
      reason === 'No Post' &&
      !!before?.organizationId &&
      isBillingEnabled() &&
      !(await this._subscriptionService
        .getSubscription(before.organizationId)
        .catch(() => null));

    if (lapsed) {
      reason = LAPSED_SUBSCRIPTION;
    }

    // The post stays ERROR rather than going back to QUEUE on purpose. A post
    // scheduled three weeks ago should not fire the moment someone resubscribes
    // — it is stale, and publishing it unasked is worse than losing it. ERROR
    // with an honest reason leaves it visible on the calendar to reschedule.
    await this._postService.changeState(
      id,
      state,
      lapsed ? reason : err,
      body
    );

    if (state !== 'ERROR' || before?.state === 'ERROR') {
      return;
    }

    // The workflow notifies for the two pre-flight cases and for bad_body, and
    // stays silent for everything else — provider 500s, media failures, a
    // lapsed subscription. Those are the common ones, and the post just died
    // without a word. Cover them here so no failure is silent, while skipping
    // the reasons that already spoke.
    const alreadyReported =
      reason === 'Refresh channel needed' ||
      reason === 'Channel disabled' ||
      // v1.0.9: the first is its own pre-flight case, the second goes out
      // through the "couldn't confirm, check your account" notice.
      reason === 'Channel setup not finished' ||
      reason === 'A previous publish attempt was interrupted' ||
      // Internal sentinels, not failures the user can act on. 'Already posted'
      // is worse than noise: the workflow writes it when it re-runs over a post
      // that already PUBLISHED, so it announces a failure that never happened.
      reason === 'No Post' ||
      reason === 'Already posted' ||
      err?.cause?.type === 'bad_body';
    if (alreadyReported) {
      return;
    }

    try {
      const post = before?.organizationId
        ? before
        : (await this._postService.getPostsRecursively(id, true))[0];
      if (!post?.organizationId) {
        return;
      }
      const channel = post.integration?.name || 'your channel';
      await this._notificationService.inAppNotification(
        post.organizationId,
        lapsed
          ? `Your post to ${channel} was not published`
          : `We couldn't publish your post to ${channel}`,
        lapsed
          ? // Not a failure of ours and not something retrying fixes, so it
            // says what happened and what to do, and is classed like the
            // reconnect-your-channel notice rather than a publish failure.
            `Your post to ${channel} was not published because your subscription is no longer active. Renew it from Billing, then reschedule the post from your calendar.`
          : `We couldn't publish your post to ${channel}${
              reason ? `: ${reason}` : ''
            }. Open the post on your calendar to see the details.`,
        true,
        false,
        lapsed ? 'info' : 'fail',
        lapsed ? '/billing' : '/launches'
      );
    } catch (e) {
      // Never let the notification take down the state change itself.
    }
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
    // Webhooks are best-effort and run after the post already published, so a
    // failure here must not fail the workflow — upstream 1e4c8dd5.
    try {
      const webhooks = (await this._webhookService.getWebhooks(orgId)).filter(
        (f) => {
          return (
            f.integrations.length === 0 ||
            f.integrations.some((i) => i.integration.id === integrationId)
          );
        }
      );

      if (webhooks.length === 0) {
        return;
      }

      // Three arguments, not upstream's one: the payload is scoped to the
      // organization and integration that the delivery belongs to.
      const post = await this._postService.getPostByForWebhookId(
        postId,
        orgId,
        integrationId
      );
      await Promise.all(
        webhooks.map(async (webhook) => {
          try {
            // The DTO resolves DNS at save time only; a host that answers
            // public then and private now would otherwise be reached here.
            // Same dispatcher the rest of the outbound fetches use. The
            // timeout is just as important — an endpoint that hangs used to
            // hold this activity open in front of plugs and repeat-post
            // scheduling.
            const ac = new AbortController();
            const timer = setTimeout(() => ac.abort(), 10000);
            try {
              await fetch(webhook.url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(post),
                signal: ac.signal,
                // Redirects are followed (the default). undici hands a manual
                // 3xx straight back instead of the spec's opaque redirect, and
                // nothing here inspects the response — so `manual` silently
                // stopped delivering to every endpoint that normalises its URL
                // (apex→www, trailing slash). The dispatcher re-checks DNS on
                // each hop, so following is still SSRF-safe.
                // @ts-ignore — undici option, not in lib.dom fetch types
                dispatcher: getSsrfSafeDispatcher(),
              });
            } finally {
              clearTimeout(timer);
            }
          } catch (e) {
            /**empty**/
          }
        })
      );
    } catch (err) {
      /**empty**/
    }
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
