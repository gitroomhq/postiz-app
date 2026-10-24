import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AutoReplyStatus, Prisma } from '@prisma/client';
import { AutoReplyDto } from '@gitroom/nestjs-libraries/dtos/auto-replies/auto-reply.dto';

// Meta allows a few send attempts per comment before we stop trying
export const MAX_AUTO_REPLY_ATTEMPTS = 3;

const integrationSelect = {
  id: true,
  name: true,
  picture: true,
  providerIdentifier: true,
} as const;

@Injectable()
export class AutoRepliesRepository {
  constructor(
    private _autoReply: PrismaRepository<'autoReply'>,
    private _autoReplyLog: PrismaRepository<'autoReplyLog'>,
    private _integration: PrismaRepository<'integration'>
  ) {}

  getAutoReplies(orgId: string) {
    return this._autoReply.model.autoReply.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
      },
      include: {
        integration: { select: integrationSelect },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  getAutoReply(orgId: string, id: string) {
    return this._autoReply.model.autoReply.findFirst({
      where: {
        id,
        organizationId: orgId,
        deletedAt: null,
      },
    });
  }

  getActiveAutoReply(id: string, integrationId: string) {
    return this._autoReply.model.autoReply.findFirst({
      where: {
        id,
        integrationId,
        active: true,
        deletedAt: null,
      },
    });
  }

  getAutoRepliesForComment(integrationId: string, postIds: string[]) {
    return this._autoReply.model.autoReply.findMany({
      where: {
        integrationId,
        active: true,
        deletedAt: null,
        OR: [{ postId: { in: postIds } }, { matchAnyPost: true }],
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  getAutoRepliesForMessage(integrationId: string) {
    return this._autoReply.model.autoReply.findMany({
      where: {
        integrationId,
        active: true,
        deletedAt: null,
        dmTriggerEnabled: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createOrUpdateAutoReply(orgId: string, body: AutoReplyDto, id?: string) {
    const data = {
      integrationId: body.integrationId,
      name: body.name,
      postId: body.matchAnyPost ? null : body.postId || null,
      postUrl: body.matchAnyPost ? null : body.postUrl || null,
      postThumbnail: body.matchAnyPost ? null : body.postThumbnail || null,
      matchAnyPost: body.matchAnyPost,
      keywords: JSON.stringify(body.keywords),
      matchAnyWord: body.matchAnyWord,
      wholeWordMatch: body.wholeWordMatch,
      dmTriggerEnabled: body.dmTriggerEnabled,
      dmMessage: body.dmMessage,
      linkUrl: body.linkUrl || null,
      linkButtonLabel: body.linkButtonLabel || null,
      openingDmEnabled: body.openingDmEnabled,
      openingDmMessage: body.openingDmMessage || null,
      openingDmButtonLabel: body.openingDmButtonLabel || null,
      requireFollow: body.requireFollow,
      followPromptMessage: body.followPromptMessage || null,
      followPromptButtonLabel: body.followPromptButtonLabel || null,
      followUpEnabled: body.followUpEnabled,
      followUpMessage: body.followUpMessage || null,
      followUpDelayMinutes: body.followUpDelayMinutes,
      publicReplyEnabled: body.publicReplyEnabled,
      publicReplyMessages: JSON.stringify(body.publicReplyMessages),
      active: body.active,
    };

    const { id: newId, active } = await this._autoReply.model.autoReply.upsert({
      where: {
        id: id || uuidv4(),
        organizationId: orgId,
      },
      create: {
        organizationId: orgId,
        ...data,
      },
      update: data,
    });

    return { id: newId, active };
  }

  changeActive(orgId: string, id: string, active: boolean) {
    return this._autoReply.model.autoReply.update({
      where: {
        id,
        organizationId: orgId,
      },
      data: {
        active,
      },
      select: { id: true, active: true },
    });
  }

  deleteAutoReply(orgId: string, id: string) {
    return this._autoReply.model.autoReply.update({
      where: {
        id,
        organizationId: orgId,
      },
      data: {
        deletedAt: new Date(),
      },
      select: { id: true },
    });
  }

  getLogs(orgId: string, autoReplyId: string) {
    return this._autoReplyLog.model.autoReplyLog.findMany({
      where: {
        organizationId: orgId,
        autoReplyId,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  getStats(orgId: string) {
    return this._autoReplyLog.model.autoReplyLog.groupBy({
      by: ['autoReplyId', 'status'],
      where: { organizationId: orgId },
      _count: { _all: true },
    });
  }

  // Integrations that can receive a webhook for this platform account
  getIntegrationsByInternalId(providerIdentifier: string, internalId: string) {
    return this._integration.model.integration.findMany({
      where: {
        providerIdentifier,
        internalId,
        deletedAt: null,
        disabled: false,
      },
    });
  }

  getIntegration(orgId: string, id: string) {
    return this._integration.model.integration.findFirst({
      where: {
        id,
        organizationId: orgId,
        deletedAt: null,
      },
    });
  }

  getIntegrationById(id: string) {
    return this._integration.model.integration.findFirst({
      where: {
        id,
        deletedAt: null,
        disabled: false,
      },
    });
  }

  getAutoReplyIntegrations(orgId: string, providerIdentifiers: string[]) {
    return this._integration.model.integration.findMany({
      where: {
        organizationId: orgId,
        providerIdentifier: { in: providerIdentifiers },
        deletedAt: null,
      },
      select: { ...integrationSelect, disabled: true, refreshNeeded: true },
    });
  }

  getLog(autoReplyId: string, eventId: string) {
    return this._autoReplyLog.model.autoReplyLog.findUnique({
      where: {
        autoReplyId_eventId: { autoReplyId, eventId },
      },
    });
  }

  upsertLog(
    autoReplyId: string,
    eventId: string,
    create: Omit<Prisma.AutoReplyLogUncheckedCreateInput, 'autoReplyId' | 'eventId'>,
    update: Prisma.AutoReplyLogUncheckedUpdateInput
  ) {
    return this._autoReplyLog.model.autoReplyLog.upsert({
      where: {
        autoReplyId_eventId: { autoReplyId, eventId },
      },
      create: { ...create, autoReplyId, eventId },
      update,
    });
  }

  updateLog(
    autoReplyId: string,
    eventId: string,
    data: Prisma.AutoReplyLogUncheckedUpdateInput
  ) {
    return this._autoReplyLog.model.autoReplyLog.update({
      where: {
        autoReplyId_eventId: { autoReplyId, eventId },
      },
      data,
    });
  }

  // A durable, atomic claim before the external send, so a crash or retry never repeats an uncertain send
  async claimDelivery(autoReplyId: string, eventId: string, leg: 'dm' | 'public') {
    const { count } = await this._autoReplyLog.model.autoReplyLog.updateMany({
      where: {
        autoReplyId,
        eventId,
        ...(leg === 'dm'
          ? {
              status: { not: AutoReplyStatus.SENT },
              dmDeliveryUnconfirmed: false,
              attempts: { lt: MAX_AUTO_REPLY_ATTEMPTS },
            }
          : { publicReplySentAt: null, publicReplyDeliveryUnconfirmed: false }),
      },
      data:
        leg === 'dm'
          ? {
              dmDeliveryUnconfirmed: true,
              attempts: { increment: 1 },
              status: AutoReplyStatus.PENDING,
              errorMessage: null,
            }
          : { publicReplyDeliveryUnconfirmed: true },
    });

    return count === 1;
  }

  // Instagram allows a single private reply per comment, across every auto reply
  getPrivateReplyUsedBy(eventId: string, autoReplyId: string) {
    return this._autoReplyLog.model.autoReplyLog.findFirst({
      where: {
        eventId,
        status: AutoReplyStatus.SENT,
        autoReplyId: { not: autoReplyId },
      },
      select: { autoReply: { select: { name: true } } },
    });
  }

  async getKnownUserName(autoReplyId: string, userId: string) {
    const log = await this._autoReplyLog.model.autoReplyLog.findFirst({
      where: { autoReplyId, userId, userName: { not: null } },
      select: { userName: true },
    });
    return log?.userName || null;
  }

  getOpeningDmLogs(integrationId: string, userId: string) {
    return this._autoReplyLog.model.autoReplyLog.findMany({
      where: {
        integrationId,
        userId,
        status: AutoReplyStatus.SENT,
        autoReply: {
          active: true,
          deletedAt: null,
          openingDmEnabled: true,
        },
      },
      distinct: ['autoReplyId'],
      select: { autoReplyId: true },
    });
  }
}
