import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import { AutoRepliesService } from '@gitroom/nestjs-libraries/database/prisma/auto-replies/auto-replies.service';
import {
  AutoReplyDto,
  AutoReplyInboxMessageDto,
} from '@gitroom/nestjs-libraries/dtos/auto-replies/auto-reply.dto';

@ApiTags('Auto Replies')
@Controller('/auto-replies')
export class AutoRepliesController {
  constructor(private _autoRepliesService: AutoRepliesService) {}

  @Get('/')
  getAutoReplies(@GetOrgFromRequest() org: Organization) {
    return this._autoRepliesService.getAutoReplies(org.id);
  }

  @Get('/setup')
  getSetup() {
    return {
      providers: this._autoRepliesService.supportedProviders().map((identifier) => ({
        identifier,
        webhookUrl: `${process.env.NEXT_PUBLIC_BACKEND_URL}/auto-replies-webhook/${identifier}`,
      })),
      verifyTokenSet: !!process.env.AUTO_REPLIES_WEBHOOK_VERIFY_TOKEN,
      messagingEnabled: process.env.INSTAGRAM_AUTO_REPLIES === 'true',
    };
  }

  @Get('/integrations')
  getIntegrations(@GetOrgFromRequest() org: Organization) {
    return this._autoRepliesService.getIntegrations(org.id);
  }

  @Get('/integrations/:id/posts')
  getRecentPosts(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._autoRepliesService.getRecentPosts(org.id, id);
  }

  @Get('/integrations/:id/conversations')
  getConversations(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._autoRepliesService.getConversations(org.id, id);
  }

  @Get('/integrations/:id/conversations/:conversationId')
  getConversationMessages(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Param('conversationId') conversationId: string
  ) {
    return this._autoRepliesService.getConversationMessages(
      org.id,
      id,
      conversationId
    );
  }

  @Post('/integrations/:id/messages')
  sendInboxMessage(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: AutoReplyInboxMessageDto
  ) {
    return this._autoRepliesService.sendInboxMessage(
      org.id,
      id,
      body.userId,
      body.message
    );
  }

  @Post('/')
  createAutoReply(
    @GetOrgFromRequest() org: Organization,
    @Body() body: AutoReplyDto
  ) {
    return this._autoRepliesService.createOrUpdateAutoReply(org.id, body);
  }

  @Put('/:id')
  updateAutoReply(
    @GetOrgFromRequest() org: Organization,
    @Body() body: AutoReplyDto,
    @Param('id') id: string
  ) {
    return this._autoRepliesService.createOrUpdateAutoReply(org.id, body, id);
  }

  @Delete('/:id')
  deleteAutoReply(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._autoRepliesService.deleteAutoReply(org.id, id);
  }

  @Post('/:id/active')
  changeActive(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body('active') active: boolean
  ) {
    return this._autoRepliesService.changeActive(org.id, id, !!active);
  }

  @Get('/:id/logs')
  getLogs(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this._autoRepliesService.getLogs(org.id, id);
  }
}
