import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { InboxItem as InboxItemType } from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';

@Injectable()
export class InboxRepository {
  constructor(private _inboxItem: PrismaRepository<'inboxItem'>) {}

  upsertItems(
    organizationId: string,
    integrationId: string,
    platform: string,
    items: InboxItemType[]
  ) {
    return Promise.all(
      items.map((item) =>
        this._inboxItem.model.inboxItem.upsert({
          where: {
            integrationId_externalId: {
              integrationId,
              externalId: item.externalId,
            },
          },
          create: {
            organizationId,
            integrationId,
            platform,
            externalId: item.externalId,
            postId: item.postId,
            type: item.type,
            senderName: item.senderName,
            senderAvatar: item.senderAvatar,
            senderExternalId: item.senderExternalId,
            content: item.content,
            parentExternalId: item.parentExternalId,
            createdAt: item.createdAt,
          },
          update: {},
        })
      )
    );
  }

  getItems(
    organizationId: string,
    params: {
      platform?: string;
      type?: string;
      unreadOnly?: boolean;
      page?: number;
    }
  ) {
    const { platform, type, unreadOnly, page = 0 } = params;
    const take = 20;

    return this._inboxItem.model.inboxItem.findMany({
      where: {
        organizationId,
        ...(platform ? { platform } : {}),
        ...(type ? { type } : {}),
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip: page * take,
      take,
      include: {
        integration: {
          select: { name: true, picture: true, providerIdentifier: true },
        },
      },
    });
  }

  getUnreadCount(organizationId: string) {
    return this._inboxItem.model.inboxItem.count({
      where: { organizationId, readAt: null },
    });
  }

  markRead(organizationId: string, id: string) {
    return this._inboxItem.model.inboxItem.updateMany({
      where: { id, organizationId },
      data: { readAt: new Date() },
    });
  }

  markReplied(organizationId: string, id: string) {
    return this._inboxItem.model.inboxItem.updateMany({
      where: { id, organizationId },
      data: { repliedAt: new Date(), readAt: new Date() },
    });
  }

  findById(organizationId: string, id: string) {
    return this._inboxItem.model.inboxItem.findFirst({
      where: { id, organizationId },
      include: {
        integration: true,
      },
    });
  }

  getLastSyncTime(integrationId: string) {
    return this._inboxItem.model.inboxItem.findFirst({
      where: { integrationId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
  }
}
