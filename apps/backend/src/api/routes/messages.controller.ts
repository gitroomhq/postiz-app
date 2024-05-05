import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MessagesService } from '@gitroom/nestjs-libraries/database/prisma/marketplace/messages.service';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { User } from '@prisma/client';
import { AddMessageDto } from '@gitroom/nestjs-libraries/dtos/messages/add.message';

@ApiTags('Messages')
@Controller('/messages')
export class MessagesController {
  constructor(private _messagesService: MessagesService) {}

  @Get('/')
  getMessagesGroup(@GetUserFromRequest() user: User) {
    return this._messagesService.getMessagesGroup(user.id);
  }

  @Get('/:groupId/:page')
  getMessages(
    @GetUserFromRequest() user: User,
    @Param('groupId') groupId: string,
    @Param('page') page: string
  ) {
    return this._messagesService.getMessages(user.id, groupId, +page);
  }
  @Post('/:groupId')
  createMessage(
    @GetUserFromRequest() user: User,
    @Param('groupId') groupId: string,
    @Body() message: AddMessageDto
  ) {
    return this._messagesService.createMessage(user.id, groupId, message);
  }
}
