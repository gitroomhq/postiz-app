import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { SaveMediaInformationDto } from '@gitroom/nestjs-libraries/dtos/media/save.media.information.dto';
import { CreateMediaFolderDto } from '@gitroom/nestjs-libraries/dtos/media/create.media.folder.dto';
import { RenameMediaFolderDto } from '@gitroom/nestjs-libraries/dtos/media/rename.media.folder.dto';

@Injectable()
export class MediaRepository {
  constructor(
    private _media: PrismaRepository<'media'>,
    private _mediaFolder: PrismaRepository<'mediaFolder'>,
  ) {}

  saveFile(
    org: string,
    fileName: string,
    filePath: string,
    originalName?: string,
  ) {
    return this._media.model.media.create({
      data: {
        organization: {
          connect: {
            id: org,
          },
        },
        name: fileName,
        path: filePath,
        originalName: originalName || null,
      },
      select: {
        id: true,
        name: true,
        originalName: true,
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
        originalName: true,
        alt: true,
        thumbnail: true,
        path: true,
        thumbnailTimestamp: true,
      },
    });
  }

  async getMedia(
    org: string,
    page: number,
    search?: string,
    folderId?: string,
  ) {
    const pageNum = (page || 1) - 1;
    const trimmedSearch = search?.trim();
    const searchFilter = trimmedSearch
      ? {
          originalName: {
            contains: trimmedSearch,
            mode: 'insensitive' as const,
          },
        }
      : {};
    const folderFilter = folderId ? { folderId } : {};
    const query = {
      where: {
        organization: {
          id: org,
        },
        deletedAt: null,
        ...searchFilter,
        ...folderFilter,
      },
    };
    const pages = Math.ceil((await this._media.model.media.count(query)) / 18);
    const results = await this._media.model.media.findMany({
      where: {
        organizationId: org,
        deletedAt: null,
        ...searchFilter,
        ...folderFilter,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        originalName: true,
        path: true,
        thumbnail: true,
        alt: true,
        thumbnailTimestamp: true,
        folderId: true,
      },
      skip: pageNum * 18,
      take: 18,
    });

    return {
      pages,
      results,
    };
  }

  getFolders(org: string) {
    return this._mediaFolder.model.mediaFolder.findMany({
      where: {
        organizationId: org,
        deletedAt: null,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  createFolder(org: string, data: CreateMediaFolderDto) {
    return this._mediaFolder.model.mediaFolder.create({
      data: {
        name: data.name,
        parentId: data.parentId || null,
        organization: {
          connect: {
            id: org,
          },
        },
      },
    });
  }

  renameFolder(org: string, id: string, data: RenameMediaFolderDto) {
    return this._mediaFolder.model.mediaFolder.update({
      where: {
        id,
        organizationId: org,
      },
      data: {
        name: data.name,
      },
    });
  }

  async deleteFolder(org: string, id: string) {
    await this._media.model.media.updateMany({
      where: {
        folderId: id,
        organizationId: org,
      },
      data: {
        folderId: null,
      },
    });

    return this._mediaFolder.model.mediaFolder.update({
      where: {
        id,
        organizationId: org,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  moveMedia(org: string, id: string, folderId?: string) {
    return this._media.model.media.update({
      where: {
        id,
        organizationId: org,
      },
      data: {
        folderId: folderId || null,
      },
    });
  }
}
