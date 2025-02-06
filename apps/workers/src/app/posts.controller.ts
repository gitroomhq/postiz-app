import { Controller } from '@nestjs/common';
import { EventPattern, Transport } from '@nestjs/microservices';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { WebhooksService } from '@gitroom/nestjs-libraries/database/prisma/webhooks/webhooks.service';

@Controller()
export class PostsController {
  constructor(
    private _postsService: PostsService,
    private _webhooksService: WebhooksService
  ) {}

  @EventPattern('post', Transport.REDIS)
  async post(data: { id: string }) {
    console.log('processing', data);
    return this._postsService.post(data.id);
  }

  @EventPattern('submit', Transport.REDIS)
  async payout(data: { id: string; releaseURL: string }) {
    return this._postsService.payout(data.id, data.releaseURL);
  }

  @EventPattern('sendDigestEmail', Transport.REDIS)
  async sendDigestEmail(data: { subject: string; org: string; since: string }) {
    return this._postsService.sendDigestEmail(
      data.subject,
      data.org,
      data.since
    );
  }

  @EventPattern('webhooks', Transport.REDIS)
  async webhooks(data: { org: string; since: string }) {
    return this._webhooksService.fireWebhooks(
      data.org,
      data.since
    );
  }
}
