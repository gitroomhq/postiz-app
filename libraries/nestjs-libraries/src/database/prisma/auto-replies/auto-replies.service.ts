// Comment and DM auto replies.
// The delivery engine is ported from OpenReply (lib/queue/dm-worker.ts),
// MIT License, Copyright (c) 2026 Anish Raj, Copyright (c) 2026 Diwen Huang
// https://github.com/diwenne/openreply
import { Injectable } from '@nestjs/common';
import { AutoReply, AutoReplyStatus, Integration } from '@prisma/client';
import { TemporalService } from 'nestjs-temporal-core';
import { TypedSearchAttributes } from '@temporalio/common';
import { organizationId } from '@gitroom/nestjs-libraries/temporal/temporal.search.attribute';
import {
  AutoRepliesRepository,
  MAX_AUTO_REPLY_ATTEMPTS,
} from '@gitroom/nestjs-libraries/database/prisma/auto-replies/auto-replies.repository';
import { AutoReplyDto } from '@gitroom/nestjs-libraries/dtos/auto-replies/auto-reply.dto';
import {
  IntegrationManager,
  socialIntegrationList,
} from '@gitroom/nestjs-libraries/integrations/integration.manager';
import {
  AutoReplyEvent,
  AutoReplyMessage,
  AutoReplyRecipient,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { AutoReplySendError } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { matchKeywords } from '@gitroom/helpers/utils/keyword.matcher';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';

type CommentEvent = Extract<AutoReplyEvent, { type: 'comment' }>;
type MessageEvent = Extract<AutoReplyEvent, { type: 'message' }>;
type PostbackEvent = Extract<AutoReplyEvent, { type: 'postback' }>;
type ReadEvent = Extract<AutoReplyEvent, { type: 'read' }>;
type FollowUpEvent = Extract<AutoReplyEvent, { type: 'followup' }>;

type Context = {
  integration: Integration;
  provider: SocialProvider;
  token: string;
};

// Meta's documented cap for private replies, per professional account per hour
const RATE_LIMIT_MAX = 750;
const RATE_LIMIT_REQUEUE_MS = 30 * 60 * 1000;
const MAX_REQUEUE_ATTEMPTS = 3;
// A send refused by a rate limit is retried later, 5 / 15 / 45 minutes
const SEND_RETRY_DELAYS_MS = [5 * 60 * 1000, 15 * 60 * 1000, 45 * 60 * 1000];
// A user who read the opening DM but never tapped its button gets the reveal after this
const OPENING_DM_READ_FALLBACK_MS = 5 * 60 * 1000;
// A brand new follow reads false for a while, measured true after about a minute
const FOLLOW_RECHECK_DELAYS_MS = (
  process.env.FOLLOW_RECHECK_DELAYS_MS || '20000,40000'
)
  .split(',')
  .map(Number)
  .filter((ms) => ms > 0);

const DEFAULT_FOLLOW_PROMPT =
  'Almost there! Follow the account, then tap the button below to get it';
const DEFAULT_FOLLOW_BUTTON = "I'm following";
const DEFAULT_LINK_BUTTON = 'Open link';

const parseList = (value: string): string[] => {
  try {
    const list = JSON.parse(value || '[]');
    return Array.isArray(list)
      ? list.filter((item) => typeof item === 'string' && item.trim())
      : [];
  } catch (err) {
    return [];
  }
};

const render = (
  message: string,
  userName: string | null | undefined,
  link?: string | null
) =>
  message
    .replace(/\{username\}/gi, userName || '')
    .replace(/\{link\}/gi, link || '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

const toSendError = (err: unknown) =>
  err instanceof AutoReplySendError
    ? err
    : // Anything that isn't an explicit refusal leaves the delivery unknown
      new AutoReplySendError((err as any)?.message || 'Unknown error', false);

@Injectable()
export class AutoRepliesService {
  constructor(
    private _autoRepliesRepository: AutoRepliesRepository,
    private _integrationManager: IntegrationManager,
    private _temporalService: TemporalService
  ) {}

  private autoReplyProvider(identifier: string) {
    const provider = this._integrationManager.getSocialIntegration(identifier);
    return provider?.autoReplyParseWebhook && provider.autoReplySend
      ? provider
      : undefined;
  }

  supportedProviders() {
    return socialIntegrationList
      .filter((p) => !!p.autoReplyParseWebhook && !!p.autoReplySend)
      .map((p) => p.identifier);
  }

  // ---------- Management ----------

  async getAutoReplies(orgId: string) {
    const [list, stats] = await Promise.all([
      this._autoRepliesRepository.getAutoReplies(orgId),
      this._autoRepliesRepository.getStats(orgId),
    ]);

    return list.map((autoReply) => ({
      ...autoReply,
      keywords: parseList(autoReply.keywords),
      publicReplyMessages: parseList(autoReply.publicReplyMessages),
      stats: stats
        .filter((s) => s.autoReplyId === autoReply.id)
        .reduce(
          (all, s) => ({ ...all, [s.status]: s._count._all }),
          {} as Partial<Record<AutoReplyStatus, number>>
        ),
    }));
  }

  getIntegrations(orgId: string) {
    return this._autoRepliesRepository.getAutoReplyIntegrations(
      orgId,
      this.supportedProviders()
    );
  }

  private async getOrgContext(orgId: string, integrationId: string) {
    const integration = await this._autoRepliesRepository.getIntegration(
      orgId,
      integrationId
    );
    const provider =
      integration && this.autoReplyProvider(integration.providerIdentifier);
    if (!integration || !provider) {
      return undefined;
    }
    return { integration, provider, token: integration.token };
  }

  async getRecentPosts(orgId: string, integrationId: string) {
    const context = await this.getOrgContext(orgId, integrationId);
    if (!context?.provider.autoReplyRecentPosts) {
      return [];
    }
    try {
      return await context.provider.autoReplyRecentPosts(
        context.token,
        context.integration
      );
    } catch (err) {
      return [];
    }
  }

  async createOrUpdateAutoReply(orgId: string, body: AutoReplyDto, id?: string) {
    const context = await this.getOrgContext(orgId, body.integrationId);
    if (!context) {
      return { success: false, error: 'This channel does not support auto replies' };
    }

    const data = await this._autoRepliesRepository.createOrUpdateAutoReply(
      orgId,
      body,
      id
    );

    return { success: true, ...data, subscribed: await this.subscribe(context) };
  }

  // Ask the platform to send this account's comments and messages to our webhook
  private async subscribe(context: Context) {
    if (!context.provider.autoReplySubscribe) {
      return true;
    }
    try {
      await context.provider.autoReplySubscribe(
        context.token,
        context.integration
      );
      return true;
    } catch (err) {
      return false;
    }
  }

  changeActive(orgId: string, id: string, active: boolean) {
    return this._autoRepliesRepository.changeActive(orgId, id, active);
  }

  deleteAutoReply(orgId: string, id: string) {
    return this._autoRepliesRepository.deleteAutoReply(orgId, id);
  }

  async getLogs(orgId: string, id: string) {
    const autoReply = await this._autoRepliesRepository.getAutoReply(orgId, id);
    if (!autoReply) {
      return [];
    }
    return this._autoRepliesRepository.getLogs(orgId, id);
  }

  // ---------- Inbox ----------

  async getConversations(orgId: string, integrationId: string) {
    const context = await this.getOrgContext(orgId, integrationId);
    if (!context?.provider.autoReplyConversations) {
      return { success: false, error: 'Inbox is not available for this channel', conversations: [] };
    }
    try {
      return {
        success: true,
        conversations: await context.provider.autoReplyConversations(
          context.token,
          context.integration
        ),
      };
    } catch (err) {
      return { success: false, error: toSendError(err).message, conversations: [] };
    }
  }

  async getConversationMessages(
    orgId: string,
    integrationId: string,
    conversationId: string
  ) {
    const context = await this.getOrgContext(orgId, integrationId);
    if (!context?.provider.autoReplyConversationMessages) {
      return { success: false, error: 'Inbox is not available for this channel', messages: [] };
    }
    try {
      return {
        success: true,
        messages: await context.provider.autoReplyConversationMessages(
          context.token,
          context.integration,
          conversationId
        ),
      };
    } catch (err) {
      return { success: false, error: toSendError(err).message, messages: [] };
    }
  }

  async sendInboxMessage(
    orgId: string,
    integrationId: string,
    userId: string,
    message: string
  ) {
    const context = await this.getOrgContext(orgId, integrationId);
    if (!context) {
      return { success: false, error: 'Inbox is not available for this channel' };
    }
    try {
      await context.provider.autoReplySend!(
        context.token,
        context.integration,
        { userId },
        { text: message }
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: toSendError(err).message };
    }
  }

  // ---------- Webhook ----------

  // Called by an external platform, never throws: a failure is logged and swallowed
  async handleWebhook(
    identifier: string,
    rawBody: string,
    headers: Record<string, string | string[] | undefined>
  ): Promise<'ok' | 'not-found' | 'invalid-signature'> {
    try {
      const provider = this.autoReplyProvider(identifier);
      if (!provider) {
        return 'not-found';
      }

      if (!provider.autoReplyVerifyWebhook?.(rawBody, headers)) {
        return 'invalid-signature';
      }

      const events = provider.autoReplyParseWebhook!(JSON.parse(rawBody));
      for (const event of events) {
        const integrations =
          await this._autoRepliesRepository.getIntegrationsByInternalId(
            identifier,
            event.accountId
          );
        for (const integration of integrations) {
          await this.startEvent(integration, event);
        }
      }
    } catch (err) {
      console.error('[AutoReplies] webhook processing failed', err);
    }

    return 'ok';
  }

  // Every event runs in its own workflow, the id dedupes platform retries
  private async startEvent(
    integration: Pick<Integration, 'id' | 'organizationId'>,
    event: AutoReplyEvent,
    delayMs = 0,
    workflowId = `auto_reply_${integration.id}_${event.eventId}`
  ) {
    try {
      await this._temporalService.client
        .getRawClient()
        ?.workflow.start('autoReplyWorkflow', {
          workflowId,
          taskQueue: 'main',
          args: [{ integrationId: integration.id, event }],
          workflowIdReusePolicy: 'REJECT_DUPLICATE',
          ...(delayMs ? { startDelay: delayMs } : {}),
          typedSearchAttributes: new TypedSearchAttributes([
            {
              key: organizationId,
              value: integration.organizationId,
            },
          ]),
        });
      return true;
    } catch (err) {
      // Already started for this event
      return false;
    }
  }

  // ---------- Delivery engine (runs inside the orchestrator activity) ----------

  async processEvent(integrationId: string, event: AutoReplyEvent) {
    const integration = await this._autoRepliesRepository.getIntegrationById(
      integrationId
    );
    const provider =
      integration && this.autoReplyProvider(integration.providerIdentifier);
    if (
      !integration ||
      !provider ||
      integration.refreshNeeded ||
      integration.inBetweenSteps
    ) {
      return;
    }

    const context: Context = { integration, provider, token: integration.token };
    switch (event.type) {
      case 'comment':
        return this.processComment(context, event);
      case 'message':
        return this.processMessage(context, event);
      case 'postback':
        return this.processPostback(context, event);
      case 'read':
        return this.processRead(context, event);
      case 'followup':
        return this.processFollowUp(context, event);
    }
  }

  private async reserveSlot(accountId: string) {
    const key = `auto_reply_rate:${accountId}`;
    try {
      const count = await ioRedis.incr(key);
      if (count === 1) {
        await ioRedis.expire(key, 3600);
      }
      if (count > RATE_LIMIT_MAX) {
        await ioRedis.decr(key);
        return false;
      }
      return true;
    } catch (err) {
      return true;
    }
  }

  private async releaseSlot(accountId: string) {
    try {
      await ioRedis.decr(`auto_reply_rate:${accountId}`);
    } catch (err) {
      /** empty **/
    }
  }

  // The DM that carries the content, with the link as a button when there is one
  private async sendReveal(
    { provider, token, integration }: Context,
    recipient: AutoReplyRecipient,
    autoReply: AutoReply,
    userName: string | null
  ) {
    if (!autoReply.linkUrl) {
      return provider.autoReplySend!(token, integration, recipient, {
        text: render(autoReply.dmMessage, userName),
      });
    }

    try {
      await provider.autoReplySend!(token, integration, recipient, {
        text: render(autoReply.dmMessage, userName) || autoReply.linkUrl,
        link: {
          title: autoReply.linkButtonLabel || DEFAULT_LINK_BUTTON,
          url: autoReply.linkUrl,
        },
      });
    } catch (err) {
      // Only a refused template is worth a second send as plain text
      if (!(err instanceof AutoReplySendError) || !err.templateRejected) {
        throw err;
      }
      const text = /\{link\}/i.test(autoReply.dmMessage)
        ? render(autoReply.dmMessage, userName, autoReply.linkUrl)
        : `${render(autoReply.dmMessage, userName)}\n${autoReply.linkUrl}`.trim();
      await provider.autoReplySend!(token, integration, recipient, { text });
    }
  }

  private followPrompt(autoReply: AutoReply, userName: string | null): AutoReplyMessage {
    return {
      text: render(autoReply.followPromptMessage || DEFAULT_FOLLOW_PROMPT, userName),
      button: {
        title: autoReply.followPromptButtonLabel || DEFAULT_FOLLOW_BUTTON,
        payload: `followcheck:${autoReply.id}`,
      },
    };
  }

  private match(autoReply: AutoReply, text: string) {
    return autoReply.matchAnyWord
      ? { matched: true, matchedKeyword: null }
      : matchKeywords(text, parseList(autoReply.keywords), autoReply.wholeWordMatch);
  }

  private async scheduleFollowUp(
    { integration }: Context,
    autoReply: AutoReply,
    accountId: string,
    userId: string,
    userName: string | null
  ) {
    if (!autoReply.followUpEnabled || !autoReply.followUpMessage?.trim()) {
      return;
    }
    const eventId = `followup_${autoReply.id}_${userId}`;
    await this.startEvent(
      integration,
      {
        type: 'followup',
        accountId,
        eventId,
        userId,
        userName: userName || undefined,
        autoReplyId: autoReply.id,
      },
      Math.max(0, autoReply.followUpDelayMinutes) * 60_000
    );
  }

  private async processComment(context: Context, event: CommentEvent) {
    const { integration, provider, token } = context;
    const autoReplies =
      await this._autoRepliesRepository.getAutoRepliesForComment(
        integration.id,
        [event.postId, event.originalPostId].filter((p): p is string => !!p)
      );

    for (const autoReply of autoReplies) {
      const { matched, matchedKeyword } = this.match(autoReply, event.text);
      if (!matched) {
        continue;
      }

      const existing = await this._autoRepliesRepository.getLog(
        autoReply.id,
        event.eventId
      );
      const needsDm =
        existing?.status !== AutoReplyStatus.SENT &&
        !existing?.dmDeliveryUnconfirmed &&
        (existing?.attempts ?? 0) < MAX_AUTO_REPLY_ATTEMPTS;

      // A DM that went out while its public reply didn't still comes back for the public reply
      if (
        !needsDm &&
        (existing?.publicReplySentAt ||
          existing?.publicReplyDeliveryUnconfirmed ||
          !autoReply.publicReplyEnabled)
      ) {
        continue;
      }

      await this._autoRepliesRepository.upsertLog(
        autoReply.id,
        event.eventId,
        {
          organizationId: integration.organizationId,
          integrationId: integration.id,
          userId: event.userId,
          userName: event.userName,
          text: event.text,
          matchedKeyword,
          status: AutoReplyStatus.PENDING,
        },
        {}
      );

      // Public reply first, so a DM failure never suppresses it
      const replies = parseList(autoReply.publicReplyMessages);
      if (
        autoReply.publicReplyEnabled &&
        replies.length &&
        !existing?.publicReplySentAt &&
        !existing?.publicReplyDeliveryUnconfirmed &&
        (await this._autoRepliesRepository.claimDelivery(
          autoReply.id,
          event.eventId,
          'public'
        ))
      ) {
        try {
          await provider.autoReplyPublicReply?.(
            token,
            integration,
            event.commentId,
            render(
              replies[Math.floor(Math.random() * replies.length)],
              event.userName,
              autoReply.linkUrl
            )
          );
          await this._autoRepliesRepository.updateLog(autoReply.id, event.eventId, {
            publicReplySentAt: new Date(),
            publicReplyError: null,
            publicReplyDeliveryUnconfirmed: false,
          });
        } catch (err) {
          const error = toSendError(err);
          await this._autoRepliesRepository.updateLog(autoReply.id, event.eventId, {
            publicReplyError: error.message,
            publicReplyDeliveryUnconfirmed: !error.rejected,
          });
        }
      }

      if (!needsDm) {
        continue;
      }

      const usedBy = await this._autoRepliesRepository.getPrivateReplyUsedBy(
        event.eventId,
        autoReply.id
      );
      if (usedBy) {
        await this._autoRepliesRepository.updateLog(autoReply.id, event.eventId, {
          status: AutoReplyStatus.SKIPPED_DEDUP,
          errorMessage: `Another auto reply (${usedBy.autoReply.name}) already sent the one private reply the platform allows for this comment`,
        });
        continue;
      }

      if (!(await this.reserveSlot(event.accountId))) {
        const attempt = event.requeueAttempt ?? 0;
        if (attempt >= MAX_REQUEUE_ATTEMPTS) {
          await this._autoRepliesRepository.updateLog(autoReply.id, event.eventId, {
            status: AutoReplyStatus.SKIPPED_RATE_LIMIT,
            errorMessage: 'Hourly DM rate limit reached',
          });
          continue;
        }
        await this._autoRepliesRepository.updateLog(autoReply.id, event.eventId, {
          errorMessage: 'Hourly rate limit hit, retry scheduled',
        });
        await this.startEvent(
          integration,
          { ...event, requeueAttempt: attempt + 1 },
          RATE_LIMIT_REQUEUE_MS,
          `auto_reply_${integration.id}_${event.eventId}_requeue_${attempt + 1}`
        );
        continue;
      }

      const useOpeningDm =
        autoReply.openingDmEnabled &&
        !!autoReply.openingDmMessage &&
        !!autoReply.openingDmButtonLabel;

      // Without an opening DM the follow check runs now, anyone not confirmed gets the prompt
      const sendFollowPrompt =
        autoReply.requireFollow &&
        !useOpeningDm &&
        (await provider.autoReplyFollowStatus?.(token, integration, event.userId)) !==
          true;

      if (
        !(await this._autoRepliesRepository.claimDelivery(
          autoReply.id,
          event.eventId,
          'dm'
        ))
      ) {
        await this.releaseSlot(event.accountId);
        continue;
      }

      const recipient = { commentId: event.commentId };
      try {
        if (useOpeningDm) {
          await provider.autoReplySend!(token, integration, recipient, {
            text: render(autoReply.openingDmMessage!, event.userName),
            button: {
              title: autoReply.openingDmButtonLabel!,
              // ":open" tells this tap apart from the follow prompt's own button
              payload: `${autoReply.requireFollow ? 'followcheck' : 'reveal'}:${autoReply.id}:open`,
            },
          });
        } else if (sendFollowPrompt) {
          await provider.autoReplySend!(
            token,
            integration,
            recipient,
            this.followPrompt(autoReply, event.userName || null)
          );
        } else {
          await this.sendReveal(context, recipient, autoReply, event.userName || null);
        }

        await this._autoRepliesRepository.updateLog(autoReply.id, event.eventId, {
          status: AutoReplyStatus.SENT,
          dmSentAt: new Date(),
          dmDeliveryUnconfirmed: false,
          errorMessage: null,
        });
      } catch (err) {
        const error = toSendError(err);
        if (error.rejected) {
          await this.releaseSlot(event.accountId);
        }
        const updated = await this._autoRepliesRepository.updateLog(
          autoReply.id,
          event.eventId,
          {
            status: AutoReplyStatus.FAILED,
            errorMessage: error.message,
            dmDeliveryUnconfirmed: !error.rejected,
          }
        );

        if (error.rejected && error.retryable && updated.attempts < MAX_AUTO_REPLY_ATTEMPTS) {
          await this.startEvent(
            integration,
            event,
            SEND_RETRY_DELAYS_MS[Math.min(updated.attempts - 1, SEND_RETRY_DELAYS_MS.length - 1)],
            `auto_reply_${integration.id}_${event.eventId}_${autoReply.id}_retry_${updated.attempts}`
          );
        }
      }
    }
  }

  // A tap may be delivered more than once, the claim keeps it to a single send
  private async sendOnce(eventId: string, send: () => Promise<unknown>) {
    const key = `auto_reply_postback:${eventId}`;
    try {
      if ((await ioRedis.set(key, '1', 'EX', 7 * 24 * 3600, 'NX')) !== 'OK') {
        return false;
      }
    } catch (err) {
      /** no redis, send anyway **/
    }

    try {
      await send();
      return true;
    } catch (err) {
      const error = toSendError(err);
      if (error.rejected) {
        await ioRedis.del(key).catch(() => undefined);
      }
      throw error;
    }
  }

  private async processPostback(context: Context, event: PostbackEvent) {
    const { integration, provider, token } = context;
    const isFollowCheck = event.payload.startsWith('followcheck:');
    if (!isFollowCheck && !event.payload.startsWith('reveal:')) {
      return;
    }

    const [autoReplyId, marker] = event.payload
      .slice(isFollowCheck ? 'followcheck:'.length : 'reveal:'.length)
      .split(':');
    const fromOpeningDm = marker === 'open';

    const autoReply = await this._autoRepliesRepository.getActiveAutoReply(
      autoReplyId,
      integration.id
    );
    if (!autoReply) {
      return;
    }

    const logId = `reveal:${event.userId}`;
    if (event.fallback) {
      const existing = await this._autoRepliesRepository.getLog(autoReply.id, logId);
      if (existing?.status === AutoReplyStatus.SENT || existing?.dmDeliveryUnconfirmed) {
        return;
      }
    }

    const userName = await this._autoRepliesRepository.getKnownUserName(
      autoReply.id,
      event.userId
    );
    const recipient = { userId: event.userId };

    if ((isFollowCheck || event.fallback) && autoReply.requireFollow) {
      const follows = await provider.autoReplyFollowStatus?.(
        token,
        integration,
        event.userId
      );
      // The read fallback needs a confirmed follow, the gate must not open by just waiting
      if (event.fallback && follows !== true) {
        return;
      }

      if (follows === false) {
        // Only the prompt's own button earns a delayed re-check, a new follow takes a moment to register
        const recheck = event.recheckAttempt ?? 0;
        if (!fromOpeningDm && recheck < FOLLOW_RECHECK_DELAYS_MS.length) {
          await this.startEvent(
            integration,
            {
              ...event,
              recheckAttempt: recheck + 1,
              eventId: `${event.eventId}_recheck_${recheck + 1}`,
            },
            FOLLOW_RECHECK_DELAYS_MS[recheck]
          );
          return;
        }

        try {
          await this.sendOnce(event.eventId, () =>
            provider.autoReplySend!(
              token,
              integration,
              recipient,
              this.followPrompt(autoReply, userName)
            )
          );
        } catch (err) {
          /** the user can tap again **/
        }
        return;
      }
    }

    const logBase = {
      organizationId: integration.organizationId,
      integrationId: integration.id,
      userId: event.userId,
      userName,
      text: '(button tap)',
    };

    try {
      const delivered = await this.sendOnce(event.eventId, () =>
        this.sendReveal(context, recipient, autoReply, userName)
      );
      if (!delivered) {
        return;
      }

      await this.scheduleFollowUp(context, autoReply, event.accountId, event.userId, userName);
      await this._autoRepliesRepository.upsertLog(
        autoReply.id,
        logId,
        { ...logBase, status: AutoReplyStatus.SENT, dmSentAt: new Date() },
        { status: AutoReplyStatus.SENT, dmSentAt: new Date(), errorMessage: null }
      );
    } catch (err) {
      const error = toSendError(err);
      // The read fallback usually hits a closed messaging window, that's expected
      if (event.fallback && error.rejected) {
        return;
      }

      await this._autoRepliesRepository.upsertLog(
        autoReply.id,
        logId,
        {
          ...logBase,
          status: AutoReplyStatus.FAILED,
          errorMessage: error.message,
          dmDeliveryUnconfirmed: !error.rejected,
        },
        {
          status: AutoReplyStatus.FAILED,
          errorMessage: error.message,
          dmDeliveryUnconfirmed: !error.rejected,
        }
      );
    }
  }

  // Read the opening DM without tapping: deliver the same next step after a grace period
  private async processRead({ integration }: Context, event: ReadEvent) {
    const logs = await this._autoRepliesRepository.getOpeningDmLogs(
      integration.id,
      event.userId
    );

    for (const { autoReplyId } of logs) {
      await this.startEvent(
        integration,
        {
          type: 'postback',
          accountId: event.accountId,
          eventId: `read_fallback_${event.userId}_${autoReplyId}`,
          userId: event.userId,
          payload: `reveal:${autoReplyId}`,
          fallback: true,
        },
        OPENING_DM_READ_FALLBACK_MS
      );
    }
  }

  // An inbound DM matching the keywords, the conversation is already open
  private async processMessage(context: Context, event: MessageEvent) {
    const { integration, provider, token } = context;
    const autoReplies =
      await this._autoRepliesRepository.getAutoRepliesForMessage(integration.id);

    for (const autoReply of autoReplies) {
      const { matched, matchedKeyword } = this.match(autoReply, event.text);
      if (!matched) {
        continue;
      }

      const existing = await this._autoRepliesRepository.getLog(
        autoReply.id,
        event.eventId
      );
      if (
        existing?.status === AutoReplyStatus.SENT ||
        existing?.dmDeliveryUnconfirmed ||
        (existing?.attempts ?? 0) >= MAX_AUTO_REPLY_ATTEMPTS
      ) {
        continue;
      }

      const userName = await this._autoRepliesRepository.getKnownUserName(
        autoReply.id,
        event.userId
      );

      await this._autoRepliesRepository.upsertLog(
        autoReply.id,
        event.eventId,
        {
          organizationId: integration.organizationId,
          integrationId: integration.id,
          userId: event.userId,
          userName,
          text: event.text,
          matchedKeyword,
          status: AutoReplyStatus.PENDING,
        },
        {}
      );

      if (
        !(await this._autoRepliesRepository.claimDelivery(
          autoReply.id,
          event.eventId,
          'dm'
        ))
      ) {
        continue;
      }

      // First contact, so an unverifiable follow gets the prompt rather than the content
      const sendFollowPrompt =
        autoReply.requireFollow &&
        (await provider.autoReplyFollowStatus?.(token, integration, event.userId)) !==
          true;

      const recipient = { userId: event.userId };
      try {
        if (sendFollowPrompt) {
          await provider.autoReplySend!(
            token,
            integration,
            recipient,
            this.followPrompt(autoReply, userName)
          );
        } else {
          await this.sendReveal(context, recipient, autoReply, userName);
          await this.scheduleFollowUp(context, autoReply, event.accountId, event.userId, userName);
        }

        await this._autoRepliesRepository.updateLog(autoReply.id, event.eventId, {
          status: AutoReplyStatus.SENT,
          dmSentAt: new Date(),
          dmDeliveryUnconfirmed: false,
          errorMessage: null,
        });
      } catch (err) {
        const error = toSendError(err);
        await this._autoRepliesRepository.updateLog(autoReply.id, event.eventId, {
          status: AutoReplyStatus.FAILED,
          errorMessage: error.message,
          dmDeliveryUnconfirmed: !error.rejected,
        });
      }
    }
  }

  // Best effort, a long delay can close the 24 hour messaging window
  private async processFollowUp({ integration, provider, token }: Context, event: FollowUpEvent) {
    const autoReply = await this._autoRepliesRepository.getActiveAutoReply(
      event.autoReplyId,
      integration.id
    );
    if (!autoReply?.followUpEnabled || !autoReply.followUpMessage?.trim()) {
      return;
    }

    try {
      await provider.autoReplySend!(
        token,
        integration,
        { userId: event.userId },
        { text: render(autoReply.followUpMessage, event.userName) }
      );
    } catch (err) {
      /** empty **/
    }
  }
}
