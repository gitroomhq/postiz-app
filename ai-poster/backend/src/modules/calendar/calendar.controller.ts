import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { CalendarService } from './calendar.service';

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  async getCalendar(
    @CurrentUser() user: AuthUser,
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('campaignIds') campaignIds?: string,
    @Query('integrationIds') integrationIds?: string,
    @Query('states') states?: string,
  ) {
    return this.calendarService.getCalendar(user.organizationId, {
      start: new Date(start),
      end: new Date(end),
      campaignIds: campaignIds ? campaignIds.split(',') : undefined,
      integrationIds: integrationIds ? integrationIds.split(',') : undefined,
      states: states ? states.split(',') : undefined,
    });
  }

  @Get('slots')
  async getSlots(
    @CurrentUser() user: AuthUser,
    @Query('campaignId') campaignId: string,
  ) {
    return this.calendarService.getSlots(user.organizationId, campaignId);
  }

  @Put('slots/:id')
  async updateSlot(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { topic?: string; status?: 'EMPTY' | 'FILLED' | 'SKIPPED' },
  ) {
    return this.calendarService.updateSlot(user.organizationId, id, body);
  }

  @Post('find-slot')
  async findSlot(
    @CurrentUser() user: AuthUser,
    @Body() body: { integrationId: string; afterDate?: string },
  ) {
    return this.calendarService.findNextAvailableSlot(
      user.organizationId,
      body.integrationId,
      body.afterDate ? new Date(body.afterDate) : undefined,
    );
  }
}
