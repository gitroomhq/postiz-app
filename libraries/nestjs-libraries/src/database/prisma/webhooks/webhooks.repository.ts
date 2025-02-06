import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { WebhooksDto } from '@gitroom/nestjs-libraries/dtos/webhooks/webhooks.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WebhooksRepository {
  constructor(private _webhooks: PrismaRepository<'webhooks'>) {}

  getTotal(orgId: string) {
    return this._webhooks.model.webhooks.count({
      where: {
        organizationId: orgId,
        deletedAt: null,
      },
    });
  }

  getWebhooks(orgId: string) {
    return this._webhooks.model.webhooks.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
      },
      include: {
        integrations: {
          select: {
            integration: {
              select: {
                id: true,
                picture: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  deleteWebhook(orgId: string, id: string) {
    return this._webhooks.model.webhooks.update({
      where: {
        id,
        organizationId: orgId,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async createWebhook(orgId: string, body: WebhooksDto) {
    const { id } = await this._webhooks.model.webhooks.upsert({
      where: {
        id: body.id || uuidv4(),
        organizationId: orgId,
      },
      create: {
        organizationId: orgId,
        url: body.url,
        name: body.name,
      },
      update: {
        url: body.url,
        name: body.name,
      },
    });

    await this._webhooks.model.webhooks.update({
      where: {
        id,
        organizationId: orgId,
      },
      data: {
        integrations: {
          deleteMany: {},
          create: body.integrations.map((integration) => ({
            integrationId: integration.id,
          })),
        },
      },
    });

    return { id };
  }
}
