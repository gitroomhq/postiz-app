import { Injectable } from '@nestjs/common';
import { Activity, ActivityMethod } from 'nestjs-temporal-core';
import { AutoRepliesService } from '@gitroom/nestjs-libraries/database/prisma/auto-replies/auto-replies.service';
import { AutoReplyEvent } from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';

@Injectable()
@Activity()
export class AutoReplyActivity {
  constructor(private _autoRepliesService: AutoRepliesService) {}

  @ActivityMethod()
  async processAutoReplyEvent(integrationId: string, event: AutoReplyEvent) {
    return this._autoRepliesService.processEvent(integrationId, event);
  }
}
