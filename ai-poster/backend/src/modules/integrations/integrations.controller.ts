import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { IntegrationsService } from './integrations.service';

@Controller('integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    return this.integrationsService.list(user.organizationId);
  }

  @Post('connect/:platform')
  async connect(
    @CurrentUser() user: AuthUser,
    @Param('platform') platform: string,
  ) {
    return this.integrationsService.getOAuthUrl(user.organizationId, platform);
  }

  @Get('callback/:platform')
  async callback(
    @CurrentUser() user: AuthUser,
    @Param('platform') platform: string,
    @Query('code') code: string,
    @Query('state') state?: string,
  ) {
    return this.integrationsService.handleOAuthCallback(
      user.organizationId,
      platform,
      code,
    );
  }

  @Put(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { name?: string; disabled?: boolean; metadata?: Record<string, any> },
  ) {
    return this.integrationsService.update(user.organizationId, id, body);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.integrationsService.remove(user.organizationId, id);
  }

  @Put(':id/profile')
  async updateProfile(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { settings: Record<string, any>; preferredTimes?: number[] },
  ) {
    return this.integrationsService.updateProfile(user.organizationId, id, body);
  }

  @Get(':id/profile')
  async getProfile(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.integrationsService.getProfile(user.organizationId, id);
  }
}
