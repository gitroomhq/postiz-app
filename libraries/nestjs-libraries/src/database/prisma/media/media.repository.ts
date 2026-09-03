import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SaveMediaInformationDto } from '@gitroom/nestjs-libraries/dtos/media/save.media.information.dto';

@Injectable()
export class MediaRepository {
  constructor(
    private _media: PrismaRepository<'media'>,
    private _categories: PrismaRepository<'mediaCategory'>,
    private _tags: PrismaRepository<'tags'>
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
        title: originalName || fileName,
      },
      select: {
        id: true,
        name: true,
        originalName: true,
        path: true,
        thumbnail: true,
        alt: true,
        status: true,
      },
    });
  }

  getMediaById(id: string, organizationId?: string) {
    return this._media.model.media.findFirst({
      where: { id, ...(organizationId ? { organizationId } : {}) },
      include: { category: true, tags: { include: { tag: true } } },
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

  async saveMediaInformation(org: string, data: SaveMediaInformationDto) {
    const { tagIds, categoryId, expiresAt, ...fields } = data;
    if (categoryId) {
      const category = await this._categories.model.mediaCategory.findFirst({ where: { id: categoryId, orgId: org, deletedAt: null } });
      if (!category) throw new BadRequestException('Media category is not available');
    }
    if (tagIds) {
      const count = await this._tags.model.tags.count({ where: { id: { in: tagIds }, orgId: org, deletedAt: null } });
      if (count !== new Set(tagIds).size) throw new BadRequestException('One or more tags are not available');
    }
    return this._media.model.media.update({
      where: {
        id: data.id,
        organizationId: org,
      },
      data: {
        ...fields,
        ...(categoryId !== undefined ? { categoryId } : {}),
        ...(expiresAt !== undefined ? { expiresAt: expiresAt ? new Date(expiresAt) : null } : {}),
        ...(tagIds !== undefined ? { tags: { deleteMany: {}, create: tagIds.map((tagId) => ({ tagId })) } } : {}),
      },
      include: { category: true, tags: { include: { tag: true } } },
    });
  }

  async getMedia(org: string, page: number, search?: string, filters: Record<string, string | string[] | undefined> = {}) {
    const pageNum = (page || 1) - 1;
    const trimmedSearch = search?.trim();
    const searchFilter = trimmedSearch
      ? {
          OR: ['originalName', 'title', 'description', 'alt', 'source', 'attribution', 'copyrightOwner'].map((field) => ({ [field]: { contains: trimmedSearch, mode: 'insensitive' as const } })),
        }
      : {};
    const tagIds = typeof filters.tagIds === 'string' ? filters.tagIds.split(',').filter(Boolean) : filters.tagIds;
    const list = (value: string | string[] | undefined) => typeof value === 'string' ? value.split(',').filter(Boolean) : value;
    const categoryId = filters.categoryId;
    const status = filters.status;
    const type = filters.type;
    const platform = filters.platform;
    const language = filters.language;
    const licenseType = filters.licenseType;
    const rights = filters.rights;
    const expiryFilter = rights === 'expired' ? { expiresAt: { lt: new Date() } } : rights === 'expiring' ? { expiresAt: { gte: new Date(), lte: new Date(Date.now() + 30 * 86400000) } } : rights === 'incomplete' ? { OR: [{ licenseType: 'unknown' }, { source: null }, { copyrightOwner: null }] } : {};
    const filter = {
      ...(categoryId ? { categoryId: String(categoryId) } : {}),
      ...(status ? { status: String(status) } : {}),
      ...(type ? { type: String(type) } : {}),
      ...(licenseType ? { licenseType: String(licenseType) } : {}),
      ...(tagIds?.length ? { tags: { some: { tagId: { in: tagIds } } } } : {}),
      ...(list(platform)?.length ? { recommendedPlatforms: { hasSome: list(platform)! } } : {}),
      ...(list(language)?.length ? { languages: { hasSome: list(language)! } } : {}),
      ...expiryFilter,
    };
    const combinedFilter = {
      ...(trimmedSearch || Object.keys(filter).length
        ? { AND: [...(trimmedSearch ? [searchFilter] : []), ...(Object.keys(filter).length ? [filter] : [])] }
        : {}),
    };
    const query = {
      where: {
        organization: {
          id: org,
        },
        deletedAt: null,
        ...combinedFilter,
      },
    };
    const pages = Math.ceil((await this._media.model.media.count(query)) / 18);
    const results = await this._media.model.media.findMany({
      where: {
        organizationId: org,
        deletedAt: null,
        ...combinedFilter,
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
        title: true, description: true, mimeType: true, fileSize: true, type: true,
        width: true, height: true, durationMs: true, dominantColor: true, status: true,
        people: true, products: true, keywords: true, focusX: true, focusY: true,
        recommendedPlatforms: true, languages: true, source: true, sourceUrl: true,
        attribution: true, copyrightOwner: true, licenseType: true, licenseUrl: true, expiresAt: true,
        createdAt: true, category: true, tags: { include: { tag: true } },
      },
      skip: pageNum * 18,
      take: 18,
    });

    return {
      pages,
      results,
    };
  }

  getCategories(org: string) { return this._categories.model.mediaCategory.findMany({ where: { orgId: org, deletedAt: null }, orderBy: { name: 'asc' } }); }
  createCategory(org: string, name: string, color?: string) { return this._categories.model.mediaCategory.create({ data: { orgId: org, name: name.trim(), color: color || '#612BD3' } }); }
  async updateCategory(org: string, id: string, name: string, color?: string) {
    const existing = await this._categories.model.mediaCategory.findFirst({ where: { id, orgId: org, deletedAt: null } });
    if (!existing) throw new NotFoundException('Media category not found');
    return this._categories.model.mediaCategory.update({ where: { id }, data: { name: name.trim(), ...(color ? { color } : {}) } });
  }
  async deleteCategory(org: string, id: string) {
    const existing = await this._categories.model.mediaCategory.findFirst({ where: { id, orgId: org, deletedAt: null } });
    if (!existing) throw new NotFoundException('Media category not found');
    return this._categories.model.mediaCategory.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async updateTechnicalMetadata(org: string, id: string, data: Record<string, unknown>) {
    const existing = await this._media.model.media.findFirst({ where: { id, organizationId: org, deletedAt: null } });
    if (!existing) throw new NotFoundException('Media not found');
    return this._media.model.media.update({ where: { id }, data });
  }
}
