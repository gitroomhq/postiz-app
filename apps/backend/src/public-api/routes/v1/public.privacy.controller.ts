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

  @Post('/export/stream')
  async stream(
    @GetOrgFromRequest() org: Organization,
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      })
    )
    body: PrivacyExportDto,
    @Res() response: Response
  ) {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', 'application/x-ndjson');
    response.setHeader('X-Accel-Buffering', 'no');
    try {
      await this._exports.stream(org.id, body, async (line) => {
        if (response.destroyed) throw new Error('Export reader disconnected');
        if (response.write(line)) return;
        await new Promise<void>((resolve, reject) => {
          const cleanup = () => {
            response.off('drain', drain);
            response.off('close', close);
            response.off('error', fail);
          };
          const drain = () => {
            cleanup();
            resolve();
          };
          const close = () => {
            cleanup();
            reject(new Error('Export reader disconnected'));
          };
          const fail = (error: Error) => {
            cleanup();
            reject(error);
          };
          response.once('drain', drain);
          response.once('close', close);
          response.once('error', fail);
        });
      });
      response.end();
    } catch (error) {
      if (response.headersSent) {
        response.destroy();
        return;
      }
      throw error;
    }
  }
}
