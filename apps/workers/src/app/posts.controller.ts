import { Controller } from '@nestjs/common';
import { EventPattern, Transport } from '@nestjs/microservices';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { WebhooksService } from '@gitroom/nestjs-libraries/database/prisma/webhooks/webhooks.service';
import { AutopostService } from '@gitroom/nestjs-libraries/database/prisma/autopost/autopost.service';

@Controller()
export class PostsController {
  constructor(
    private _postsService: PostsService,
    private _webhooksService: WebhooksService,
    private _autopostsService: AutopostService
  ) {}

  @EventPattern('sendDigestEmail', Transport.REDIS)
  async sendDigestEmail(data: { subject: string; org: string; since: string }) {
    try {
      return await this._postsService.sendDigestEmail(
        data.subject,
        data.org,
        data.since
      );
    } catch (err) {
      console.log(
        "Unhandled error, let's avoid crashing the digest worker",
        err
      );
    }
  }

  @EventPattern('webhooks', Transport.REDIS)
  async webhooks(data: { org: string; since: string }) {
    try {
      return await this._webhooksService.fireWebhooks(data.org, data.since);
    } catch (err) {
      console.log(
        "Unhandled error, let's avoid crashing the webhooks worker",
        err
      );
    }
  }

  @EventPattern('cron', Transport.REDIS)
  async cron(data: { id: string }) {
    try {
      return await this._autopostsService.startAutopost(data.id);
    } catch (err) {
      console.log(
        "Unhandled error, let's avoid crashing the autopost worker",
        err
      );
    }
  }
}
