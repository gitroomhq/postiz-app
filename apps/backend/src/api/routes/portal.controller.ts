import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ContentService } from '@gitroom/nestjs-libraries/database/prisma/crm/content.service';
import { AddEventDto } from '@gitroom/nestjs-libraries/dtos/crm/content.dto';

@ApiTags('Portal')
@Controller('/portal')
export class PortalController {
  constructor(private _contentService: ContentService) {}

  @Get('/:token')
  getFeed(@Param('token') token: string) {
    return this._contentService.getPortalFeed(token);
  }

  @Post('/:token/items/:itemId/approve')
  approve(
    @Param('token') token: string,
    @Param('itemId') itemId: string,
  ) {
    return this._contentService.guestApprove(token, itemId);
  }

  @Post('/:token/items/:itemId/request-adjustment')
  requestAdjustment(
    @Param('token') token: string,
    @Param('itemId') itemId: string,
    @Body() body: AddEventDto,
  ) {
    return this._contentService.guestRequestAdjustment(token, itemId, body);
  }

  @Post('/:token/items/:itemId/comments')
  addComment(
    @Param('token') token: string,
    @Param('itemId') itemId: string,
    @Body() body: AddEventDto,
  ) {
    return this._contentService.guestComment(token, itemId, body);
  }
}
