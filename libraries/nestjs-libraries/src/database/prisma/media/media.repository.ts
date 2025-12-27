import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { SaveMediaInformationDto } from '@gitroom/nestjs-libraries/dtos/media/save.media.information.dto';

@Injectable()
export class MediaRepository {
  constructor(
    private _media: PrismaRepository<'media'>,
    private _post: PrismaRepository<'post'>
  ) { }

  saveFile(org: string, fileName: string, filePath: string) {
    return this._media.model.media.create({
      data: {
        organization: {
          connect: {
            id: org,
          },
        },
        name: fileName,
        path: filePath,
      },
      select: {
        id: true,
        name: true,
        path: true,
        thumbnail: true,
        alt: true,
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
    return this._media.model.media.updateMany({
      where: {
        id,
        organizationId: org,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  saveMediaInformation(org: string, data: SaveMediaInformationDto) {
    return this._media.model.media.update({
      where: {
        id: data.id,
        organizationId: org,
      },
      data: {
        alt: data.alt,
        thumbnail: data.thumbnail,
        thumbnailTimestamp: data.thumbnailTimestamp,
      },
      select: {
        id: true,
        name: true,
        alt: true,
        thumbnail: true,
        path: true,
        thumbnailTimestamp: true,
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
        alt: true,
        thumbnailTimestamp: true,
      },
      skip: pageNum * 28,
      take: 28,
    });

    return {
      pages,
      results,
    };
  }

  async getMediaIdsFromUnpublishedPosts(orgId: string): Promise<Set<string>> {
    const unpublishedPosts = await this._post.model.post.findMany({
      where: {
        organizationId: orgId,
        state: {
          in: ['QUEUE', 'DRAFT'],
        },
        deletedAt: null,
      },
      select: {
        image: true,
      },
    });

    const mediaIds = new Set<string>();
    for (const post of unpublishedPosts) {
      if (post.image) {
        try {
          const images = JSON.parse(post.image);
          for (const img of images) {
            if (img?.id) {
              mediaIds.add(img.id);
            }
          }
        } catch { }
      }
    }
    return mediaIds;
  }

  async getMediaByIds(ids: string[]) {
    return this._media.model.media.findMany({
      where: {
        id: { in: ids },
      },
    });
  }

  async bulkDeleteMedia(orgId: string, ids: string[]) {
    return this._media.model.media.updateMany({
      where: {
        id: { in: ids },
        organizationId: orgId,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async getAllMedia(orgId: string) {
    return this._media.model.media.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        path: true,
      },
    });
  }
}
