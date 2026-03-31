import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Post,
} from '@nestjs/common';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { User } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import { AnnouncementsService } from '@gitroom/nestjs-libraries/database/prisma/announcements/announcements.service';
import { AnnouncementDto } from '@gitroom/nestjs-libraries/dtos/announcements/announcements.dto';

@ApiTags('Announcements')
@Controller('/announcements')
export class AnnouncementsController {
  constructor(private _announcementsService: AnnouncementsService) {}

  @Get('/')
  async getAnnouncements() {
    return this._announcementsService.getAnnouncements();
  }

  @Post('/')
  async createAnnouncement(
    @GetUserFromRequest() user: User,
    @Body() body: AnnouncementDto
  ) {
    if (!user.isSuperAdmin) {
      throw new HttpException('Unauthorized', 400);
    }
    return this._announcementsService.createAnnouncement(body);
  }

  @Delete('/:id')
  async deleteAnnouncement(
    @GetUserFromRequest() user: User,
    @Param('id') id: string
  ) {
    if (!user.isSuperAdmin) {
      throw new HttpException('Unauthorized', 400);
    }
    return this._announcementsService.deleteAnnouncement(id);
  }
}
