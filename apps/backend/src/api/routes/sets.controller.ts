import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import { SetsService } from '@gitroom/nestjs-libraries/database/prisma/sets/sets.service';
import {
  UpdateSetsDto,
  SetsDto,
} from '@gitroom/nestjs-libraries/dtos/sets/sets.dto';

@ApiTags('Sets')
@Controller('/sets')
export class SetsController {
  constructor(private _setsService: SetsService) {}

  @Get('/')
  async getSets(@GetOrgFromRequest() org: Organization) {
    return this._setsService.getSets(org.id);
  }

  @Post('/')
  async createASet(
    @GetOrgFromRequest() org: Organization,
    @Body() body: SetsDto
  ) {
    return this._setsService.createSet(org.id, body);
  }

  @Put('/')
  async updateSet(
    @GetOrgFromRequest() org: Organization,
    @Body() body: UpdateSetsDto
  ) {
    return this._setsService.createSet(org.id, body);
  }

  @Delete('/:id')
  async deleteSet(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._setsService.deleteSet(org.id, id);
  }
} 