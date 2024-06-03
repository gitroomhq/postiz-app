import { Body, Controller, Get, Inject, Param, Post, Query } from '@nestjs/common';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { StarsService } from '@gitroom/nestjs-libraries/database/prisma/stars/stars.service';
import dayjs from 'dayjs';
import { StarsListDto } from '@gitroom/nestjs-libraries/dtos/analytics/stars.list.dto';
import { ApiTags } from '@nestjs/swagger';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';

@ApiTags('Analytics')
@Controller('/analytics')
export class AnalyticsController {
  constructor(
    private _starsService: StarsService,
    private _integrationService: IntegrationService,
    private _integrationManager: IntegrationManager
  ) {}
  @Get('/')
  async getStars(@GetOrgFromRequest() org: Organization) {
    return this._starsService.getStars(org.id);
  }

  @Get('/trending')
  async getTrending() {
    const todayTrending = dayjs(dayjs().format('YYYY-MM-DDT12:00:00'));
    const last = todayTrending.isAfter(dayjs())
      ? todayTrending.subtract(1, 'day')
      : todayTrending;
    const nextTrending = last.add(1, 'day');

    return {
      last: last.format('YYYY-MM-DD HH:mm:ss'),
      predictions: nextTrending.format('YYYY-MM-DD HH:mm:ss'),
    };
  }

  @Post('/stars')
  async getStarsFilter(
    @GetOrgFromRequest() org: Organization,
    @Body() starsFilter: StarsListDto
  ) {
    return {
      stars: await this._starsService.getStarsFilter(org.id, starsFilter),
    };
  }

  @Get('/:integration')
  async getIntegration(
    @GetOrgFromRequest() org: Organization,
    @Param('integration') integration: string,
    @Query('date') date: string
  ) {
    const getIntegration = await this._integrationService.getIntegrationById(
      org.id,
      integration
    );

    if (!getIntegration) {
      throw new Error('Invalid integration');
    }

    if (getIntegration.type === 'social') {
      const integrationProvider = this._integrationManager.getSocialIntegration(
        getIntegration.providerIdentifier
      );

      const getIntegrationData = await ioRedis.get(`integration:${org.id}:${integration}:${date}`);
      if (getIntegrationData) {
        return JSON.parse(getIntegrationData)
      }

      if (integrationProvider.analytics) {
        const loadAnalytics = await integrationProvider.analytics(getIntegration.internalId, getIntegration.token, +date);
        await ioRedis.set(`integration:${org.id}:${integration}:${date}`, JSON.stringify(loadAnalytics), 'EX', !process.env.NODE_ENV || process.env.NODE_ENV === 'development' ? 1 : 3600);
        return loadAnalytics;
      }

      return {};
    }
  }
}
