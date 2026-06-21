import { Injectable, NotFoundException } from '@nestjs/common';
import { ProjectRepository } from './project.repository';
import { CrmRepository } from './crm.repository';
import { CreateProjectDto, UpdateProjectDto } from '@gitroom/nestjs-libraries/dtos/crm/project.dto';

@Injectable()
export class ProjectService {
  constructor(
    private _projectRepository: ProjectRepository,
    private _crmRepository: CrmRepository,
  ) {}

  async listProjects(orgId: string, clientId?: string, status?: string, page?: string) {
    const pageNum = Math.max(0, parseInt(page || '0', 10) || 0);
    const [items, total] = await Promise.all([
      this._projectRepository.listProjects(orgId, clientId, status, pageNum),
      this._projectRepository.countProjects(orgId, clientId, status),
    ]);
    return { items, total, page: pageNum };
  }

  async getProject(orgId: string, id: string) {
    const project = await this._projectRepository.getProjectById(orgId, id);
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async createProject(orgId: string, ownerId: string, dto: CreateProjectDto) {
    const client = await this._crmRepository.clientBelongsToOrg(orgId, dto.clientId);
    if (!client) throw new NotFoundException('Client not found');
    return this._projectRepository.createProject(ownerId, dto);
  }

  async updateProject(orgId: string, id: string, dto: UpdateProjectDto) {
    await this._assertExists(orgId, id);
    return this._projectRepository.updateProject(id, dto);
  }

  async deleteProject(orgId: string, id: string) {
    await this._assertExists(orgId, id);
    return this._projectRepository.softDeleteProject(id);
  }

  private async _assertExists(orgId: string, id: string) {
    const exists = await this._projectRepository.projectBelongsToOrg(orgId, id);
    if (!exists) throw new NotFoundException('Project not found');
  }
}
