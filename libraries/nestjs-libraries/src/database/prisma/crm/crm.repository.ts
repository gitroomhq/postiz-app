import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { ProjectStatus } from '@prisma/client';
import { CreateClientDto, UpdateClientDto } from '@gitroom/nestjs-libraries/dtos/crm/client.dto';

const CLIENT_SELECT = {
  id: true,
  name: true,
  email: true,
  website: true,
  segment: true,
  status: true,
  notes: true,
  responsibleId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  _count: { select: { projects: true, contacts: true, interactions: true } },
} as const;

const CLIENT_DETAIL_SELECT = {
  ...CLIENT_SELECT,
  projects: {
    where: { deletedAt: null },
    select: { id: true, name: true, status: true, businessArea: true, toneOfVoice: true, createdAt: true },
    orderBy: { createdAt: 'desc' as const },
  },
  contacts: {
    select: { id: true, name: true, role: true, email: true, phone: true },
    orderBy: { name: 'asc' as const },
  },
  interactions: {
    select: { id: true, type: true, summary: true, userId: true, createdAt: true },
    orderBy: { createdAt: 'desc' as const },
    take: 20,
  },
} as const;

@Injectable()
export class CrmRepository {
  constructor(private _client: PrismaRepository<'client'>) {}

  listClients(orgId: string, search?: string, status?: ProjectStatus, page = 0) {
    const PAGE_SIZE = 20;
    return this._client.model.client.findMany({
      where: {
        orgId,
        deletedAt: null,
        ...(status ? { status } : {}),
        ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
      },
      select: CLIENT_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
    });
  }

  countClients(orgId: string, search?: string, status?: ProjectStatus) {
    return this._client.model.client.count({
      where: {
        orgId,
        deletedAt: null,
        ...(status ? { status } : {}),
        ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
      },
    });
  }

  getClientById(orgId: string, id: string) {
    return this._client.model.client.findFirst({
      where: { id, orgId, deletedAt: null },
      select: CLIENT_DETAIL_SELECT,
    });
  }

  createClient(orgId: string, data: CreateClientDto) {
    return this._client.model.client.create({
      data: { orgId, ...data },
      select: CLIENT_SELECT,
    });
  }

  updateClient(orgId: string, id: string, data: UpdateClientDto) {
    return this._client.model.client.update({
      where: { id },
      data,
      select: CLIENT_SELECT,
    });
  }

  softDeleteClient(orgId: string, id: string) {
    return this._client.model.client.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });
  }

  clientBelongsToOrg(orgId: string, id: string) {
    return this._client.model.client.findFirst({
      where: { id, orgId, deletedAt: null },
      select: { id: true },
    });
  }
}
