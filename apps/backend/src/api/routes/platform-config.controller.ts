import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization, User } from '@prisma/client';
import { PlatformConfigService } from '@gitroom/nestjs-libraries/database/prisma/platform-config/platform.config.service';

@ApiTags('PlatformConfig')
@Controller('/settings/platforms')
export class PlatformConfigController {
  constructor(private _platformConfigService: PlatformConfigService) {}

  private assertPermission(user: User, org: Organization) {
    if (!user || !org) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
  }

  @Get('/')
  async getPlatforms(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() org: Organization
  ) {
    this.assertPermission(user, org);
    return this._platformConfigService.getAllPlatformConfigs(
      process.env.FRONTEND_URL ||
        process.env.MAIN_URL ||
        'http://localhost:4007'
    );
  }

  @Get('/system')
  async getSystemConfig(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() org: Organization
  ) {
    this.assertPermission(user, org);
    return this._platformConfigService.getSystemConfig();
  }

  @Post('/system')
  async saveSystemConfig(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() org: Organization,
    @Body() body: { appUrl?: string; disableRegistration?: boolean }
  ) {
    this.assertPermission(user, org);
    try {
      return await this._platformConfigService.saveSystemConfig(body);
    } catch (err: any) {
      throw new HttpException(
        err?.message || 'Failed to save system configuration',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Delete('/system')
  async resetSystemConfig(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() org: Organization
  ) {
    this.assertPermission(user, org);
    try {
      return await this._platformConfigService.resetSystemConfig();
    } catch (err: any) {
      throw new HttpException(
        err?.message || 'Failed to reset system configuration',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Post('/:platform')
  async savePlatform(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() org: Organization,
    @Param('platform') platform: string,
    @Body() body: Record<string, string>
  ) {
    this.assertPermission(user, org);
    try {
      return await this._platformConfigService.savePlatformConfig(platform, body);
    } catch (err: any) {
      throw new HttpException(
        err?.message || 'Failed to save platform configuration',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Delete('/:platform')
  async deletePlatform(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() org: Organization,
    @Param('platform') platform: string
  ) {
    this.assertPermission(user, org);
    try {
      return await this._platformConfigService.deletePlatformConfig(platform);
    } catch (err: any) {
      throw new HttpException(
        err?.message || 'Failed to delete platform configuration',
        HttpStatus.BAD_REQUEST
      );
    }
  }
}
