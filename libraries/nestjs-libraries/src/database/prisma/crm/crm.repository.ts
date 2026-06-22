import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { CreateClientDto, UpdateClientDto, CreateContactDto, CreateInteractionDto } from '@gitroom/nestjs-libraries/dtos/crm/client.dto';
import { CreateExpertDto, UpdateExpertDto } from '@gitroom/nestjs-libraries/dtos/crm/expert.dto';

const EXPERT_SELECT = {
  id: true,
  name: true,
  role: true,
  avatarUrl: true,
  handle: true,
  bio: true,
  toneOfVoice: true,
  audience: true,
  keywords: true,
  dna: true,
  createdAt: true,
  updatedAt: true,
  // Religare reading (1:1) — feeds the Volatis carousel briefing with the
  // expert's real tone/themes. Pulled here so every expert response carries it
  // without a separate endpoint; null when the expert has no Religare profile.
  religareProfile: { select: { dna: true, status: true } },
} as const;

/** Expert + as marcas (clients) a que está vinculado — para a UI de N:N. */
const EXPERT_DETAIL_SELECT = {
  ...EXPERT_SELECT,
  clients: {
    select: { client: { select: { id: true, name: true } } },
  },
} as const;

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
  constructor(
    private _client: PrismaRepository<'client'>,
    private _contact: PrismaRepository<'clientContact'>,
    private _interaction: PrismaRepository<'clientInteraction'>,
    private _expert: PrismaRepository<'expert'>,
    private _clientExpert: PrismaRepository<'clientExpert'>,
  ) {}

  listClients(orgId: string, search?: string, status?: string, page = 0) {
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

  countClients(orgId: string, search?: string, status?: string) {
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
      where: { id, orgId },
      data,
      select: CLIENT_SELECT,
    });
  }

  softDeleteClient(orgId: string, id: string) {
    return this._client.model.client.update({
      where: { id, orgId },
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

  createContact(clientId: string, data: CreateContactDto) {
    return this._contact.model.clientContact.create({
      data: { clientId, ...data },
      select: { id: true, name: true, role: true, email: true, phone: true },
    });
  }

  createInteraction(clientId: string, userId: string, data: CreateInteractionDto) {
    return this._interaction.model.clientInteraction.create({
      data: { clientId, userId, ...data },
      select: { id: true, type: true, summary: true, userId: true, createdAt: true },
    });
  }

  /* ----------------------------------------------------------------- experts */

  listExperts(orgId: string, search?: string) {
    return this._expert.model.expert.findMany({
      where: {
        orgId,
        deletedAt: null,
        ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
      },
      select: EXPERT_DETAIL_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  getExpertById(orgId: string, id: string) {
    return this._expert.model.expert.findFirst({
      where: { id, orgId, deletedAt: null },
      select: EXPERT_DETAIL_SELECT,
    });
  }

  createExpert(orgId: string, data: CreateExpertDto) {
    return this._expert.model.expert.create({
      data: { orgId, ...data },
      select: EXPERT_SELECT,
    });
  }

  updateExpert(orgId: string, id: string, data: UpdateExpertDto) {
    return this._expert.model.expert.update({
      where: { id, orgId },
      data,
      select: EXPERT_SELECT,
    });
  }

  softDeleteExpert(orgId: string, id: string) {
    return this._expert.model.expert.update({
      where: { id, orgId },
      data: { deletedAt: new Date() },
      select: { id: true },
    });
  }

  expertBelongsToOrg(orgId: string, id: string) {
    return this._expert.model.expert.findFirst({
      where: { id, orgId, deletedAt: null },
      select: { id: true },
    });
  }

  /** Experts vinculados a uma marca (client). */
  listExpertsForClient(clientId: string) {
    return this._expert.model.expert.findMany({
      where: { deletedAt: null, clients: { some: { clientId } } },
      select: EXPERT_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  /** Vincula expert↔marca (idempotente via unique [clientId, expertId]). */
  linkExpertToClient(clientId: string, expertId: string) {
    return this._clientExpert.model.clientExpert.upsert({
      where: { clientId_expertId: { clientId, expertId } },
      create: { clientId, expertId },
      update: {},
      select: { id: true },
    });
  }

  unlinkExpertFromClient(clientId: string, expertId: string) {
    return this._clientExpert.model.clientExpert.deleteMany({
      where: { clientId, expertId },
    });
  }
}
