import {
  Controller,
  Get,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { Organization, User } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Notifications')
@Controller('/notifications')
export class NotificationsController {
  constructor(private _notificationsService: NotificationService) {}
  @Get('/')
  async mainPageList(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() organization: Organization
  ) {
    return this._notificationsService.getMainPageCount(
      organization.id,
      user.id
    );
  }

  @Get('/list')
  async notifications(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() organization: Organization
  ) {
    return this._notificationsService.getNotifications(
      organization.id,
      user.id
    );
  }

  /** Advances lastReadNotifications — used by Mark all read (and open-to-clear badge). */
  @Post('/read')
  async markAllRead(@GetUserFromRequest() user: User) {
    return this._notificationsService.markAllAsRead(user.id);
  }

  /** Local UI QA only — creates a real unread in-app notification. Hidden in production. */
  @Post('/dev-test')
  async createDevTest(@GetOrgFromRequest() organization: Organization) {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }
    const stamp = new Date().toISOString();
    await this._notificationsService.inAppNotification(
      organization.id,
      'DEV test notification',
      `DEV test notification — injected at ${stamp}`,
      false
    );
    return { ok: true };
  }
}
