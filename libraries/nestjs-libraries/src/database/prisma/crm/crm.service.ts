import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CrmRepository } from './crm.repository';
import { ProjectStatus } from '@prisma/client';
import { CreateClientDto, UpdateClientDto } from '@gitroom/nestjs-libraries/dtos/crm/client.dto';

@Injectable()
export class CrmService {
  constructor(private _crmRepository: CrmRepository) {}

  async listClients(orgId: string, search?: string, status?: ProjectStatus, page?: string) {
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

  private async _assertClientExists(orgId: string, id: string) {
    const exists = await this._crmRepository.clientBelongsToOrg(orgId, id);
    if (!exists) throw new NotFoundException('Client not found');
  }
}
