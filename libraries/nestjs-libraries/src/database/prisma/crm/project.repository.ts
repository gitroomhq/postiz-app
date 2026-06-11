import { Injectable } from '@nestjs/common';
import { ProjectStatus, ToneOfVoice } from '@prisma/client';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto } from '@gitroom/nestjs-libraries/dtos/crm/project.dto';

const PROJECT_LIST_SELECT = {
  id: true,
  name: true,
  status: true,
  businessArea: true,
  toneOfVoice: true,
  slogan: true,
  createdAt: true,
  updatedAt: true,
  clientId: true,
  ownerId: true,
  client: { select: { id: true, name: true } },
} as const;

const PROJECT_DETAIL_SELECT = {
  ...PROJECT_LIST_SELECT,
  website: true,
  bioLink: true,
  productsServices: true,
  cta1: true,
  cta2: true,
  cta3: true,
  briefing: true,
  locale: true,
  timezone: true,
  socialHandles: true,
  persona: true,
} as const;

@Injectable()
export class ProjectRepository {
  constructor(private _project: PrismaRepository<'project'>) {}

  listProjects(orgId: string, clientId?: string, status?: string, page = 0) {
    const PAGE_SIZE = 30;
    return this._project.model.project.findMany({
      where: {
        deletedAt: null,
        client: { orgId },
        ...(clientId ? { clientId } : {}),
        ...(status ? { status: status as ProjectStatus } : {}),
      },
      select: PROJECT_LIST_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
    });
  }

  countProjects(orgId: string, clientId?: string, status?: string) {
    return this._project.model.project.count({
      where: {
        deletedAt: null,
        client: { orgId },
        ...(clientId ? { clientId } : {}),
        ...(status ? { status: status as ProjectStatus } : {}),
      },
    });
  }

  getProjectById(orgId: string, id: string) {
    return this._project.model.project.findFirst({
      where: { id, deletedAt: null, client: { orgId } },
      select: PROJECT_DETAIL_SELECT,
    });
  }

  createProject(data: CreateProjectDto) {
    const { clientId, ownerId, toneOfVoice, status, ...rest } = data;
    return this._project.model.project.create({
      data: {
        ...rest,
        ownerId,
        ...(toneOfVoice ? { toneOfVoice: toneOfVoice as ToneOfVoice } : {}),
        ...(status ? { status: status as ProjectStatus } : {}),
        client: { connect: { id: clientId } },
      },
      select: PROJECT_LIST_SELECT,
    });
  }

  updateProject(id: string, data: UpdateProjectDto) {
    const { toneOfVoice, status, ...rest } = data;
    return this._project.model.project.update({
      where: { id },
      data: {
        ...rest,
        ...(toneOfVoice ? { toneOfVoice: toneOfVoice as ToneOfVoice } : {}),
        ...(status ? { status: status as ProjectStatus } : {}),
      },
      select: PROJECT_DETAIL_SELECT,
    });
  }

  softDeleteProject(id: string) {
    return this._project.model.project.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });
  }

  projectBelongsToOrg(orgId: string, id: string) {
    return this._project.model.project.findFirst({
      where: { id, deletedAt: null, client: { orgId } },
      select: { id: true },
    });
  }
}
