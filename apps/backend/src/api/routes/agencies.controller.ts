import { Controller, Get } from '@nestjs/common';
import { User } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import { AgenciesService } from '@gitroom/nestjs-libraries/database/prisma/agencies/agencies.service';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';

@ApiTags('Agencies')
@Controller('/agencies')
export class AgenciesController {
  constructor(private _agenciesService: AgenciesService) {}
  @Get('/')
  async generateImage(@GetUserFromRequest() user: User) {
    return this._agenciesService.getAgencyByUser(user);
  }
}
