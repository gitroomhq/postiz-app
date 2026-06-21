import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { ContentRepository } from './content.repository';
import { ProjectRepository } from './project.repository';
import { CreateContentItemDto, UpdateContentItemDto, AddEventDto } from '@gitroom/nestjs-libraries/dtos/crm/content.dto';

@Injectable()
export class ContentService {
  private readonly _portalSecret: string;

  constructor(
    private _contentRepository: ContentRepository,
    private _projectRepository: ProjectRepository,
    private _projectAccessLink: PrismaRepository<'projectAccessLink'>,
  ) {
    const secret = process.env['PORTAL_SECRET'];
    if (!secret) {
      throw new Error('PORTAL_SECRET environment variable is required');
    }
    this._portalSecret = secret;
  }

  listItems(projectId: string, orgId: string) {
    return this._contentRepository.listItems(projectId, orgId);
  }

  async getItem(projectId: string, orgId: string, id: string) {
    const item = await this._contentRepository.getItem(projectId, orgId, id);
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }

  async createItem(projectId: string, orgId: string, userId: string, dto: CreateContentItemDto) {
    const project = await this._projectRepository.projectBelongsToOrg(orgId, projectId);
    if (!project) throw new NotFoundException('Project not found');
    return this._contentRepository.createItem(projectId, orgId, userId, dto);
  }

  async updateItem(projectId: string, orgId: string, id: string, dto: UpdateContentItemDto) {
    await this._assertItemExists(projectId, orgId, id);
    return this._contentRepository.updateItem(id, dto);
  }

  async deleteItem(projectId: string, orgId: string, id: string) {
    await this._assertItemExists(projectId, orgId, id);
    return this._contentRepository.softDeleteItem(id);
  }

  async addComment(projectId: string, orgId: string, id: string, dto: AddEventDto) {
    await this._assertItemExists(projectId, orgId, id);
    return this._contentRepository.addEvent(id, 'COMMENT', dto.text, false);
  }

  async generatePortalLink(projectId: string, orgId: string, createdById: string) {
    const project = await this._projectRepository.projectBelongsToOrg(orgId, projectId);
    if (!project) throw new NotFoundException('Project not found');

    const token = crypto.randomUUID();
    const tokenHash = crypto.createHmac('sha256', this._portalSecret)
      .update(token)
      .digest('hex');

    await this._projectAccessLink.model.projectAccessLink.create({
      data: { projectId, tokenHash, createdById },
    });

    return { token };
  }

  async resolvePortalToken(token: string) {
    const tokenHash = crypto.createHmac('sha256', this._portalSecret)
      .update(token)
      .digest('hex');

    const link = await this._projectAccessLink.model.projectAccessLink.findFirst({
      where: { tokenHash, revokedAt: null },
      select: { id: true, projectId: true },
    });

    if (!link) throw new ForbiddenException('Link inválido ou expirado');

    await this._projectAccessLink.model.projectAccessLink.update({
      where: { id: link.id },
      data: { lastUsedAt: new Date() },
    });

    return link;
  }

  async getPortalFeed(token: string) {
    const link = await this.resolvePortalToken(token);
    const items = await this._contentRepository.listItemsByProject(link.projectId);
    return { projectId: link.projectId, items };
  }

  async guestComment(token: string, itemId: string, dto: AddEventDto) {
    const link = await this.resolvePortalToken(token);
    const item = await this._contentRepository.getItemByIdOnly(itemId);
    if (!item || item.projectId !== link.projectId) {
      throw new NotFoundException('Item not found');
    }
    return this._contentRepository.addEvent(itemId, 'GUEST_COMMENT', dto.text, true);
  }

  async guestApprove(token: string, itemId: string) {
    const link = await this.resolvePortalToken(token);
    const item = await this._contentRepository.getItemByIdOnly(itemId);
    if (!item || item.projectId !== link.projectId) {
      throw new NotFoundException('Item not found');
    }
    const [updated] = await Promise.all([
      this._contentRepository.updateItem(itemId, { status: 'APPROVED' }),
      this._contentRepository.addEvent(itemId, 'APPROVED_BY_GUEST', 'Aprovado pelo cliente', true),
    ]);
    return updated;
  }

  async guestRequestAdjustment(token: string, itemId: string, dto: AddEventDto) {
    const link = await this.resolvePortalToken(token);
    const item = await this._contentRepository.getItemByIdOnly(itemId);
    if (!item || item.projectId !== link.projectId) {
      throw new NotFoundException('Item not found');
    }
    const [updated] = await Promise.all([
      this._contentRepository.updateItem(itemId, { status: 'ADJUSTMENT_REQUESTED' }),
      this._contentRepository.addEvent(itemId, 'ADJUSTMENT_REQUESTED_BY_GUEST', dto.text, true),
    ]);
    return updated;
  }

  private async _assertItemExists(projectId: string, orgId: string, id: string) {
    const item = await this._contentRepository.getItem(projectId, orgId, id);
    if (!item) throw new NotFoundException('Item not found');
  }
}
