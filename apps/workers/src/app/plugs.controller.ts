import { Controller } from '@nestjs/common';
import { EventPattern, Transport } from '@nestjs/microservices';
import { BullMqClient } from '@gitroom/nestjs-libraries/bull-mq-transport-new/client';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';

@Controller()
export class PlugsController {
  constructor(
    private _workerServiceProducer: BullMqClient,
    private _integrationService: IntegrationService
  ) {}

  @EventPattern('plugs', Transport.REDIS)
  async plug(data: {
    orgId: string;
    integrationId: string;
    funcName: string;
    retry: number;
    delay: number;
  }) {
    try {
      await this._integrationService.startPlug(data);

      if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') {
        return this._workerServiceProducer.emit('plugs', {
          id: data.integrationId + '-' + data.funcName,
          options: {
            delay: 6000, // delay,
          },
          payload: {
            ...data,
            retry: data.retry,
          },
        });
      }
    } catch (e) {
      if (data.retry > 3) {
        return;
      }
      return this._workerServiceProducer.emit('plugs', {
        id: data.integrationId + '-' + data.funcName,
        options: {
          delay: data.delay, // delay,
        },
        payload: {
          ...data,
          retry: data.retry + 1,
        },
      });
    }
  }
}
