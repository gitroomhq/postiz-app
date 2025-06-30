import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MediaRepository {
  constructor(private _media: PrismaRepository<'media'>) {}

  saveFile(org: string, fileName: string, filePath: string) {
    const file = fileName.split('.');
    return this._media.model.media.create({
      data: {
        organization: {
          connect: {
            id: org,
          },
        },
        name: fileName,
        path: filePath,
        ...(fileName.indexOf('mp4') > -1
          ? { thumbnail: `${file[0]}.thumbnail.jpg` }
          : {}),
      },
      select: {
        id: true,
        name: true,
        path: true,
        thumbnail: true,
      },
    });
  }

  getMediaById(id: string) {
    return this._media.model.media.findUnique({
      where: {
        id,
      },
    });
  }

  deleteMedia(org: string, id: string) {
    return this._media.model.media.update({
      where: {
        id,
        organizationId: org,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async getMedia(org: string, page: number) {
    const pageNum = (page || 1) - 1;
    const query = {
      where: {
        organization: {
          id: org,
        },
      },
    };
    const pages =
      pageNum === 0
        ? Math.ceil((await this._media.model.media.count(query)) / 28)
        : 0;
    const results = await this._media.model.media.findMany({
      where: {
        organizationId: org,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        path: true,
        thumbnail: true,
      },
      skip: pageNum * 28,
      take: 28,
    });

    return {
      pages,
      results,
    };
  }
}
