import { Injectable, NotFoundException } from '@nestjs/common';
import { CrmRepository } from './crm.repository';
import { CreateClientDto, UpdateClientDto, CreateContactDto, CreateInteractionDto } from '@gitroom/nestjs-libraries/dtos/crm/client.dto';
import { CreateExpertDto, UpdateExpertDto } from '@gitroom/nestjs-libraries/dtos/crm/expert.dto';

@Injectable()
export class CrmService {
  constructor(private _crmRepository: CrmRepository) {}

  async listClients(orgId: string, search?: string, status?: string, page?: string) {
    const pageNum = Math.max(0, parseInt(page || '0', 10) || 0);
    const [items, total] = await Promise.all([
      this._crmRepository.listClients(orgId, search, status, pageNum),
      this._crmRepository.countClients(orgId, search, status),
    ]);
    return { items, total, page: pageNum };
  }

  async getClient(orgId: string, id: string) {
    const client = await this._crmRepository.getClientById(orgId, id);
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  createClient(orgId: string, dto: CreateClientDto) {
    return this._crmRepository.createClient(orgId, dto);
  }

  async updateClient(orgId: string, id: string, dto: UpdateClientDto) {
    await this._assertClientExists(orgId, id);
    return this._crmRepository.updateClient(orgId, id, dto);
  }

  async deleteClient(orgId: string, id: string) {
    await this._assertClientExists(orgId, id);
    return this._crmRepository.softDeleteClient(orgId, id);
  }

  async createContact(orgId: string, clientId: string, dto: CreateContactDto) {
    await this._assertClientExists(orgId, clientId);
    return this._crmRepository.createContact(clientId, dto);
  }

  async createInteraction(orgId: string, clientId: string, userId: string, dto: CreateInteractionDto) {
    await this._assertClientExists(orgId, clientId);
    return this._crmRepository.createInteraction(clientId, userId, dto);
  }

  private async _assertClientExists(orgId: string, id: string) {
    const exists = await this._crmRepository.clientBelongsToOrg(orgId, id);
    if (!exists) throw new NotFoundException('Client not found');
  }

  /* ----------------------------------------------------------------- experts */

  listExperts(orgId: string, search?: string, skip?: number, take?: number) {
    return this._crmRepository.listExperts(orgId, search, skip, take);
  }

  async getExpert(orgId: string, id: string) {
    const expert = await this._crmRepository.getExpertById(orgId, id);
    if (!expert) throw new NotFoundException('Expert not found');
    return expert;
  }

  createExpert(orgId: string, dto: CreateExpertDto) {
    return this._crmRepository.createExpert(orgId, dto);
  }

  async updateExpert(orgId: string, id: string, dto: UpdateExpertDto) {
    await this._assertExpertExists(orgId, id);
    return this._crmRepository.updateExpert(orgId, id, dto);
  }

  async deleteExpert(orgId: string, id: string) {
    await this._assertExpertExists(orgId, id);
    return this._crmRepository.softDeleteExpert(orgId, id);
  }

  listExpertsForClient(orgId: string, clientId: string) {
    return this._assertClientExists(orgId, clientId).then(() =>
      this._crmRepository.listExpertsForClient(clientId)
    );
  }

  async linkExpert(orgId: string, clientId: string, expertId: string) {
    await this._assertClientExists(orgId, clientId);
    await this._assertExpertExists(orgId, expertId);
    return this._crmRepository.linkExpertToClient(clientId, expertId);
  }

  async unlinkExpert(orgId: string, clientId: string, expertId: string) {
    await this._assertClientExists(orgId, clientId);
    await this._assertExpertExists(orgId, expertId);
    return this._crmRepository.unlinkExpertFromClient(clientId, expertId);
  }

  private async _assertExpertExists(orgId: string, id: string) {
    const exists = await this._crmRepository.expertBelongsToOrg(orgId, id);
    if (!exists) throw new NotFoundException('Expert not found');
  }
}
