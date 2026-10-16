import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthService } from '@gitroom/nestjs-libraries/health/health.service';

@ApiTags('Health')
@Controller('/health')
export class HealthController {
  constructor(private _healthService: HealthService) {}

  @Get('/')
  async check() {
    const health = await this._healthService.check();

    if (health.status !== 'ok') {
      throw new ServiceUnavailableException(health);
    }

    return health;
  }
}
