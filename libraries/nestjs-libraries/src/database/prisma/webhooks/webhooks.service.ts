import { Injectable } from '@nestjs/common';
import { WebhooksRepository } from '@gitroom/nestjs-libraries/database/prisma/webhooks/webhooks.repository';
import { WebhooksDto } from '@gitroom/nestjs-libraries/dtos/webhooks/webhooks.dto';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import { BullMqClient } from '@gitroom/nestjs-libraries/bull-mq-transport-new/client';
import { PostsRepository } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.repository';

@Injectable()
export class WebhooksService {
  constructor(
    private _webhooksRepository: WebhooksRepository,
    private _postsRepository: PostsRepository,
    private _workerServiceProducer: BullMqClient
  ) {}

  getTotal(orgId: string) {
    return this._webhooksRepository.getTotal(orgId);
  }

  getWebhooks(orgId: string) {
    return this._webhooksRepository.getWebhooks(orgId);
  }

  createWebhook(orgId: string, body: WebhooksDto) {
    return this._webhooksRepository.createWebhook(orgId, body);
  }

  deleteWebhook(orgId: string, id: string) {
    return this._webhooksRepository.deleteWebhook(orgId, id);
  }

  async digestWebhooks(orgId: string, since: string) {
    const date = new Date().toISOString();
    await ioRedis.watch('webhook_' + orgId);
    const value = await ioRedis.get('webhook_' + orgId);
    if (value) {
      return;
    }

    await ioRedis
      .multi()
      .set('webhook_' + orgId, date)
      .expire('webhook_' + orgId, 60)
      .exec();

    this._workerServiceProducer.emit('webhooks', {
      id: 'digest_' + orgId,
      options: {
        delay: 60000,
      },
      payload: {
        org: orgId,
        since,
      },
    });
  }

  async fireWebhooks(orgId: string, since: string) {
    const list = await this._postsRepository.getPostsSince(orgId, since);
    const webhooks = await this._webhooksRepository.getWebhooks(orgId);
    const sendList = [];
    for (const webhook of webhooks) {
      const toSend = [];
      if (webhook.integrations.length === 0) {
        toSend.push(...list);
      } else {
        toSend.push(
          ...list.filter((post) =>
            webhook.integrations.some(
              (i) => i.integration.id === post.integration.id
            )
          )
        );
      }

      if (toSend.length) {
        sendList.push({
          url: webhook.url,
          data: toSend,
        });
      }
    }

    return Promise.all(
      sendList.map(async (s) => {
        try {
          await fetch(s.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(s.data),
          });
        } catch (e) {
          /**empty**/
        }
      })
    );
  }
}
