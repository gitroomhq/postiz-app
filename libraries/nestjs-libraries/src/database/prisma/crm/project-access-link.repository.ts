import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

@Injectable()
export class ProjectAccessLinkRepository {
  constructor(private _link: PrismaRepository<'projectAccessLink'>) {}

  createLink(projectId: string, tokenHash: string, createdById: string) {
    return this._link.model.projectAccessLink.create({
      data: { projectId, tokenHash, createdById },
    });
  }

  findByTokenHash(tokenHash: string) {
    return this._link.model.projectAccessLink.findFirst({
      where: { tokenHash, revokedAt: null },
      select: { id: true, projectId: true },
    });
  }

  touchLastUsed(id: string) {
    return this._link.model.projectAccessLink.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  }
}
