import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Monitor')
@Controller('/monitor')
export class MonitorController {
  @Get('/queue/:name')
  async getMessagesGroup(@Param('name') name: string) {
    return {
      status: 'success',
      message: `Queue ${name} is healthy.`,
    };
  }
}
