import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { AnnouncementDto } from '@gitroom/nestjs-libraries/dtos/announcements/announcements.dto';
import { AnnouncementColor } from '@prisma/client';

@Injectable()
export class AnnouncementsRepository {
  constructor(private _announcements: PrismaRepository<'announcement'>) {}

  getAnnouncements() {
    return this._announcements.model.announcement.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  createAnnouncement(body: AnnouncementDto) {
    return this._announcements.model.announcement.create({
      data: {
        title: body.title,
        description: body.description,
        color: (body.color as AnnouncementColor) || AnnouncementColor.INFO,
      },
    });
  }

  deleteAnnouncement(id: string) {
    return this._announcements.model.announcement.delete({
      where: {
        id,
      },
    });
  }
}
