import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MessagesService } from '@gitroom/nestjs-libraries/database/prisma/marketplace/messages.service';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { Organization, User } from '@prisma/client';
import { AddMessageDto } from '@gitroom/nestjs-libraries/dtos/messages/add.message';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';

@ApiTags('Messages')
@Controller('/messages')
export class MessagesController {
  constructor(private _messagesService: MessagesService) {}

  @Get('/')
  getMessagesGroup(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() organization: Organization
  ) {
    return this._messagesService.getMessagesGroup(user.id, organization.id);
  }

  @Get('/:groupId/:page')
  getMessages(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() organization: Organization,
    @Param('groupId') groupId: string,
    @Param('page') page: string
  ) {
    return this._messagesService.getMessages(
      user.id,
      organization.id,
      groupId,
      +page
    );
  }
  @Post('/:groupId')
  createMessage(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() organization: Organization,
    @Param('groupId') groupId: string,
    @Body() message: AddMessageDto
  ) {
    return this._messagesService.createMessage(
      user.id,
      organization.id,
      groupId,
      message
    );
  }
}
