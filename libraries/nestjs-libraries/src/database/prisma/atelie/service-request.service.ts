import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ServiceRequestRepository } from './service-request.repository';
import { ServiceOfferingRepository } from './service-offering.repository';
import { ProjectRepository } from '@gitroom/nestjs-libraries/database/prisma/crm/project.repository';
import {
  CreateServiceRequestDto,
  AddServiceRequestEventDto,
} from '@gitroom/nestjs-libraries/dtos/atelie/service-request.dto';

@Injectable()
export class ServiceRequestService {
  constructor(
    private _requestRepository: ServiceRequestRepository,
    private _offeringRepository: ServiceOfferingRepository,
    private _projectRepository: ProjectRepository,
  ) {}

  listOfferings() {
    return this._offeringRepository.listActive();
  }

  listQueue(orgId: string) {
    return this._requestRepository.listQueue(orgId);
  }

  async getRequest(orgId: string, id: string) {
    const request = await this._requestRepository.getById(orgId, id);
    if (!request) throw new NotFoundException('Pedido não encontrado');
    return request;
  }

  async createRequest(orgId: string, userId: string, projectId: string, dto: CreateServiceRequestDto) {
    const offering = await this._offeringRepository.getBySlug(dto.offeringSlug);
    if (!offering) throw new BadRequestException('Serviço não encontrado no catálogo do Ateliê');

    const snapshot = await this._projectRepository.getContextPackSnapshot(orgId, projectId);
    if (!snapshot) throw new NotFoundException('Projeto não encontrado');

    const { contextPackComplete, hasReligareProfile } = this._evaluateContextPack(snapshot);

    return this._requestRepository.create({
      projectId,
      orgId,
      offeringId: offering.id,
      createdById: userId,
      briefing: dto.briefing,
      scopeLevel: dto.scopeLevel,
      priceRange: dto.priceRange,
      leadTimeRange: dto.leadTimeRange,
      contextPackComplete,
      hasReligareProfile,
    });
  }

  async updateStatus(orgId: string, id: string, status: string) {
    await this.getRequest(orgId, id);
    const [updated] = await Promise.all([
      this._requestRepository.updateStatus(orgId, id, status),
      this._requestRepository.addEvent(id, 'STATUS_CHANGED', status),
    ]);
    return updated;
  }

  async addEvent(orgId: string, id: string, dto: AddServiceRequestEventDto) {
    await this.getRequest(orgId, id);
    return this._requestRepository.addEvent(id, dto.type, dto.text);
  }

  /**
   * Achado do teste ponta a ponta da AT-1 (2026-07-02, cliente Nanda Biolchini): cores/
   * tipografia costumam estar vazias no CRM, e nem todo projeto tem perfil Religare. O
   * cockpit precisa saber disso ANTES de liberar produção, não descobrir só no documento.
   */
  private _evaluateContextPack(snapshot: {
    businessArea: string | null;
    colors: unknown;
    typography: unknown;
    persona: unknown;
    cta1: string | null;
    client: { experts: { expert: { religareProfile: { id: string } | null } }[] };
  }) {
    const contextPackComplete = Boolean(
      snapshot.businessArea && snapshot.colors && snapshot.typography && snapshot.persona && snapshot.cta1,
    );
    const hasReligareProfile = snapshot.client.experts.some((e) => e.expert.religareProfile != null);
    return { contextPackComplete, hasReligareProfile };
  }
}
