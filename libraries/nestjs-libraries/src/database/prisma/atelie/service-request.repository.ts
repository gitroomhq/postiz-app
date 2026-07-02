import { Injectable } from '@nestjs/common';
import { ServiceRequestStatus, ServiceScopeLevel } from '@prisma/client';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

const REQUEST_SELECT = {
  id: true,
  projectId: true,
  offeringId: true,
  briefing: true,
  scopeLevel: true,
  status: true,
  priceRange: true,
  leadTimeRange: true,
  contextPackComplete: true,
  hasReligareProfile: true,
  deliverableUrl: true,
  createdAt: true,
  updatedAt: true,
  project: { select: { id: true, name: true } },
  offering: { select: { id: true, slug: true, name: true, category: true, deliveryMode: true } },
} as const;

const REQUEST_WITH_EVENTS_SELECT = {
  ...REQUEST_SELECT,
  events: {
    select: { id: true, type: true, text: true, createdAt: true },
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

@Injectable()
export class ServiceRequestRepository {
  constructor(
    private _request: PrismaRepository<'serviceRequest'>,
    private _event: PrismaRepository<'serviceRequestEvent'>,
  ) {}

  /** Fila do cockpit (/atelie/fila) — todos os pedidos abertos da org, mais antigos primeiro. */
  listQueue(orgId: string) {
    return this._request.model.serviceRequest.findMany({
      where: { orgId, deletedAt: null, status: { not: 'ARQUIVADO' } },
      select: REQUEST_SELECT,
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      take: 500,
    });
  }

  getById(orgId: string, id: string) {
    return this._request.model.serviceRequest.findFirst({
      where: { id, orgId, deletedAt: null },
      select: REQUEST_WITH_EVENTS_SELECT,
    });
  }

  create(params: {
    projectId: string;
    orgId: string;
    offeringId: string;
    createdById: string;
    briefing: Record<string, any>;
    scopeLevel?: string;
    priceRange?: string;
    leadTimeRange?: string;
    contextPackComplete: boolean;
    hasReligareProfile: boolean;
  }) {
    return this._request.model.serviceRequest.create({
      data: {
        projectId: params.projectId,
        orgId: params.orgId,
        offeringId: params.offeringId,
        createdById: params.createdById,
        briefing: params.briefing,
        ...(params.scopeLevel ? { scopeLevel: params.scopeLevel as ServiceScopeLevel } : {}),
        ...(params.priceRange ? { priceRange: params.priceRange } : {}),
        ...(params.leadTimeRange ? { leadTimeRange: params.leadTimeRange } : {}),
        contextPackComplete: params.contextPackComplete,
        hasReligareProfile: params.hasReligareProfile,
      },
      select: REQUEST_SELECT,
    });
  }

  updateStatus(orgId: string, id: string, status: string) {
    return this._request.model.serviceRequest.update({
      where: { id, orgId },
      data: { status: status as ServiceRequestStatus },
      select: REQUEST_SELECT,
    });
  }

  setDeliverableUrl(orgId: string, id: string, deliverableUrl: string) {
    return this._request.model.serviceRequest.update({
      where: { id, orgId },
      data: { deliverableUrl },
      select: REQUEST_SELECT,
    });
  }

  addEvent(requestId: string, type: string, text?: string) {
    return this._event.model.serviceRequestEvent.create({
      data: { requestId, type, text },
      select: { id: true, type: true, text: true, createdAt: true },
    });
  }
}
