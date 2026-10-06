import {
  Body,
  Controller,
  Post,
  UseGuards,
  Res,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { SuperAdminGuard } from '@gitroom/backend/services/auth/super.admin.guard';
import { PrivacyExportDto } from '@gitroom/nestjs-libraries/dtos/users/privacy.export.dto';
import { PrivacyExportService } from '@gitroom/nestjs-libraries/database/prisma/privacy/privacy.export.service';

@ApiTags('Privacy exports')
@Controller('/public/v1/privacy')
// Person exports are platform-wide and require the platform SuperAdminGuard.
@UseGuards(SuperAdminGuard)
export class PublicPrivacyController {
  constructor(private _exports: PrivacyExportService) {}

  @Post('/export')
  async export(
    @GetOrgFromRequest() org: Organization,
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      })
    )
    body: PrivacyExportDto,
    @Res({ passthrough: true }) response: Response
  ) {
    response.setHeader('Cache-Control', 'no-store');
    return this._exports.export(org.id, body);
  }
}
