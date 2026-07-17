import { Injectable } from '@nestjs/common';
import { Activity, ActivityMethod } from 'nestjs-temporal-core';
import {
  AutomationService,
  WebhookRunItem,
} from '@gitroom/nestjs-libraries/database/prisma/automations/automation.service';

@Injectable()
@Activity()
export class WebhooksActivity {
  constructor(private _automationService: AutomationService) {}

  @ActivityMethod()
  async matchWebhookEvents(
    platform: string,
    events: { postId: string; commentId: string; text: string }[]
  ) {
    return this._automationService.matchWebhookEvents(platform, events);
  }

  @ActivityMethod()
  async runWebhook(platform: string, item: WebhookRunItem) {
    return this._automationService.runWebhook(platform, item);
  }
}
