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
    try {
      return await this._integrationService.processPlugs(data);
    } catch (err) {
      console.log(
        "Unhandled error, let's avoid crashing the plug worker",
        err
      );
    }
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
    try {
      return await this._integrationService.processInternalPlug(data);
    } catch (err) {
      console.log(
        "Unhandled error, let's avoid crashing the internal plugs worker",
        err
      );
    }
  }
}
