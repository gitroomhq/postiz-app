import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationsRepository {
  constructor(
    private _notifications: PrismaRepository<'notifications'>,
    private _user: PrismaRepository<'user'>
  ) {}

  getLastReadNotification(userId: string) {
    return this._user.model.user.findFirst({
      where: {
        id: userId,
      },
      select: {
        lastReadNotifications: true,
      },
    });
  }

  async getMainPageCount(organizationId: string, userId: string) {
    const { lastReadNotifications } = (await this.getLastReadNotification(
      userId
    ))!;

    return {
      total: await this._notifications.model.notifications.count({
        where: {
          organizationId,
          createdAt: {
            gt: lastReadNotifications!,
          },
        },
      }),
    };
  }

  async createNotification(organizationId: string, content: string) {
    await this._notifications.model.notifications.create({
      data: {
        organizationId,
        content,
      },
    });
  }

  async getNotificationsSince(organizationId: string, since: string) {
    return this._notifications.model.notifications.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: new Date(since),
        },
      },
    });
  }

  async getNotificationsPaginated(organizationId: string, page: number) {
    const limit = 100;
    const skip = page * limit;

    const where = {
      organizationId,
      deletedAt: null as Date | null,
    };

    const [notifications, total] = await Promise.all([
      this._notifications.model.notifications.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
        select: {
          id: true,
          content: true,
          link: true,
          createdAt: true,
        },
      }),
      this._notifications.model.notifications.count({ where }),
    ]);

    return {
      notifications,
      total,
      page,
      limit,
      hasMore: skip + notifications.length < total,
    };
  }

  async getNotifications(organizationId: string, userId: string) {
    const { lastReadNotifications } = (await this.getLastReadNotification(
      userId
    ))!;

    // Do not advance lastRead here — listing used to mark everything read before
    // the UI could paint unread styles (and any SWR revalidate/mutate of this
    // endpoint had the same side effect). Mark via markAllAsRead instead.
    return {
      lastReadNotifications,
      notifications: await this._notifications.model.notifications.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
        where: {
          organizationId,
        },
        select: {
          id: true,
          createdAt: true,
          content: true,
        },
      }),
    };
  }

  async markAllAsRead(userId: string) {
    await this._user.model.user.update({
      where: {
        id: userId,
      },
      data: {
        lastReadNotifications: new Date(),
      },
    });
    return { ok: true };
  }
}
