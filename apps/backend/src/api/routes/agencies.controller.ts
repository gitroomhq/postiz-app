import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { User } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import { AgenciesService } from '@gitroom/nestjs-libraries/database/prisma/agencies/agencies.service';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { CreateAgencyDto } from '@gitroom/nestjs-libraries/dtos/agencies/create.agency.dto';

@ApiTags('Agencies')
@Controller('/agencies')
export class AgenciesController {
  constructor(private _agenciesService: AgenciesService) {}
  @Get('/')
  async getAgencyByUsers(@GetUserFromRequest() user: User) {
    return (await this._agenciesService.getAgencyByUser(user)) || {};
  }

  @Post('/')
  async createAgency(
    @GetUserFromRequest() user: User,
    @Body() body: CreateAgencyDto
  ) {
    return this._agenciesService.createAgency(user, body);
  }

  @Post('/action/:action/:id')
  async updateAgency(
    @GetUserFromRequest() user: User,
    @Param('action') action: string,
    @Param('id') id: string
  ) {
    if (!user.isSuperAdmin) {
      return 400;
    }

    return this._agenciesService.approveOrDecline(user.email, action, id);
  }
}
