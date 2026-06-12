import { Injectable } from '@nestjs/common';
import { ContentStatus, ContentType } from '@prisma/client';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { CreateContentItemDto, UpdateContentItemDto } from '@gitroom/nestjs-libraries/dtos/crm/content.dto';

const ITEM_SELECT = {
  id: true,
  title: true,
  body: true,
  mediaUrls: true,
  type: true,
  status: true,
  position: true,
  scheduledAt: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
} as const;

const ITEM_WITH_EVENTS_SELECT = {
  ...ITEM_SELECT,
  events: {
    select: { id: true, type: true, text: true, byGuest: true, createdAt: true },
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

@Injectable()
export class ContentRepository {
  constructor(private _content: PrismaRepository<'contentItem'>) {}

  listItems(projectId: string, orgId: string) {
    return this._content.model.contentItem.findMany({
      where: { projectId, orgId, deletedAt: null },
      select: ITEM_SELECT,
      orderBy: [{ status: 'asc' }, { position: 'asc' }, { createdAt: 'desc' }],
    });
  }

  getItem(projectId: string, orgId: string, id: string) {
    return this._content.model.contentItem.findFirst({
      where: { id, projectId, orgId, deletedAt: null },
      select: ITEM_WITH_EVENTS_SELECT,
    });
  }

  createItem(projectId: string, orgId: string, createdById: string, dto: CreateContentItemDto) {
    return this._content.model.contentItem.create({
      data: {
        projectId,
        orgId,
        createdById,
        title: dto.title,
        body: dto.body,
        mediaUrls: dto.mediaUrls ?? [],
        ...(dto.type ? { type: dto.type as ContentType } : {}),
        ...(dto.scheduledAt ? { scheduledAt: new Date(dto.scheduledAt) } : {}),
      },
      select: ITEM_SELECT,
    });
  }

  updateItem(id: string, dto: UpdateContentItemDto) {
    return this._content.model.contentItem.update({
      where: { id },
      data: {
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.body !== undefined ? { body: dto.body } : {}),
        ...(dto.mediaUrls ? { mediaUrls: dto.mediaUrls } : {}),
        ...(dto.type ? { type: dto.type as ContentType } : {}),
        ...(dto.status ? { status: dto.status as ContentStatus } : {}),
        ...(dto.scheduledAt ? { scheduledAt: new Date(dto.scheduledAt) } : {}),
      },
      select: ITEM_SELECT,
    });
  }

  softDeleteItem(id: string) {
    return this._content.model.contentItem.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });
  }

  addEvent(itemId: string, type: string, text: string, byGuest = false) {
    return this._content.model.contentItemEvent.create({
      data: { itemId, type, text, byGuest },
      select: { id: true, type: true, text: true, byGuest: true, createdAt: true },
    });
  }

  getItemByIdOnly(id: string) {
    return this._content.model.contentItem.findFirst({
      where: { id, deletedAt: null },
      select: ITEM_WITH_EVENTS_SELECT,
    });
  }

  listItemsByProject(projectId: string) {
    return this._content.model.contentItem.findMany({
      where: {
        projectId,
        deletedAt: null,
        status: { in: ['PENDING_APPROVAL', 'ADJUSTMENT_REQUESTED'] },
      },
      select: ITEM_WITH_EVENTS_SELECT,
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    });
  }
}
