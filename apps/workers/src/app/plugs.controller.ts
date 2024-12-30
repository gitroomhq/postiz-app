import { Controller } from '@nestjs/common';
import { EventPattern, Transport } from '@nestjs/microservices';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';

@Controller()
export class PlugsController {
  constructor(private _integrationService: IntegrationService) {}

  @EventPattern('plugs', Transport.REDIS)
  async plug(data: {
    plugId: string;
    postId: string;
    delay: number;
    totalRuns: number;
    currentRun: number;
  }) {
    return this._integrationService.processPlugs(data);
  }

  @EventPattern('internal-plugs', Transport.REDIS)
  async internalPlug(data: {
    post: string;
    originalIntegration: string;
    integration: string;
    plugName: string;
    orgId: string;
    delay: number;
    information: any;
  }) {
    return this._integrationService.processInternalPlug(data);
  }
}
