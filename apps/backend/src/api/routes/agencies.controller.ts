import { Controller, Get, Post } from '@nestjs/common';
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
  async generateImage(@GetUserFromRequest() user: User) {
    return this._agenciesService.getAgencyByUser(user);
  }

  @Post('/')
  async createAgency(@GetUserFromRequest() user: User, body: CreateAgencyDto) {
    return this._agenciesService.createAgency(user, body);
  }
}
