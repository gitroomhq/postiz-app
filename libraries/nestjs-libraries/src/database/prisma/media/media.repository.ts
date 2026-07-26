import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { SaveMediaInformationDto } from '@gitroom/nestjs-libraries/dtos/media/save.media.information.dto';

@Injectable()
export class MediaRepository {
  constructor(
    private _media: PrismaRepository<'media'>,
    private _mediaFolder: PrismaRepository<'mediaFolder'>
  ) {}

  saveFile(org: string, fileName: string, filePath: string, originalName?: string) {
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
    folderId?: string
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
    // 'unfiled' = media with no folder; a real id = that folder; else all.
    const folderFilter =
      folderId === 'unfiled'
        ? { folderId: null }
        : folderId
        ? { folderId }
        : {};
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
        type: true,
      },
      skip: pageNum * 18,
      take: 18,
    });

    return {
      pages,
      results,
    };
  }

  // --- Media Library folders (org-scoped) ---
  listFolders(org: string) {
    return this._mediaFolder.model.mediaFolder.findMany({
      where: { organizationId: org, deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }

  folderCounts(org: string) {
    return this._media.model.media.groupBy({
      by: ['folderId'],
      where: { organizationId: org, deletedAt: null },
      _count: { _all: true },
    });
  }

  createFolder(org: string, name: string) {
    return this._mediaFolder.model.mediaFolder.create({
      data: { organizationId: org, name },
      select: { id: true, name: true },
    });
  }

  renameFolder(org: string, id: string, name: string) {
    return this._mediaFolder.model.mediaFolder.updateMany({
      where: { id, organizationId: org },
      data: { name },
    });
  }

  async deleteFolder(org: string, id: string) {
    // Un-file this folder's media (never orphan it), then soft-delete the folder.
    await this._media.model.media.updateMany({
      where: { organizationId: org, folderId: id },
      data: { folderId: null },
    });
    return this._mediaFolder.model.mediaFolder.updateMany({
      where: { id, organizationId: org },
      data: { deletedAt: new Date() },
    });
  }

  assignFolder(org: string, mediaId: string, folderId: string | null) {
    return this._media.model.media.updateMany({
      where: { id: mediaId, organizationId: org },
      data: { folderId: folderId || null },
    });
  }
}
