import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { InboxService } from '@gitroom/nestjs-libraries/database/prisma/inbox/inbox.service';

@ApiTags('Inbox')
@Controller('/inbox')
export class InboxController {
  constructor(private _inboxService: InboxService) {}

  @Get('/count')
  getUnreadCount(@GetOrgFromRequest() org: Organization) {
    return this._inboxService.getUnreadCount(org);
  }

  @Get('/')
  getItems(
    @GetOrgFromRequest() org: Organization,
    @Query('platform') platform?: string,
    @Query('type') type?: string,
    @Query('unread') unread?: string,
    @Query('page') page?: string
  ) {
    return this._inboxService.getItems(org, {
      platform,
      type,
      unreadOnly: unread === 'true',
      page: page ? +page : 0,
    });
  }

  @Post('/:id/read')
  markRead(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._inboxService.markRead(org, id);
  }

  @Post('/:id/reply')
  reply(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body('message') message: string
  ) {
    return this._inboxService.reply(org, id, message);
  }
}
