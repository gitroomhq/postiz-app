import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { OrgRepository } from "@clickvote/backend/src/packages/org/org.repository";
import { UsersService } from '@clickvote/backend/src/packages/users/users.service';
import { OrgInviteStatus } from '@clickvote/interfaces';

@Injectable()
export class OrgService {
  constructor(
    private readonly _orgRepository: OrgRepository,
    private readonly _usersService: UsersService
  ) {}

  async getById(id: string) {
    return this._orgRepository.getById(id);
  }
  async createOrg(name: string) {
    return this._orgRepository.createOrg(name);
  }

  async updateOrg(id: string, name: string) {
    return this._orgRepository.updateOrg(id, name);
  }

  async getOrgInvites(id: string) {
    return this._orgRepository.getInvitesByOrgId(id);
  }

  async createOrgInvite(orgId: string, email: string) {
    const user = await this._usersService.getByEmail(email);
    const isUserAlreadyInOrg = user.org.includes(orgId);
    if (isUserAlreadyInOrg) {
      throw new HttpException('User is already a member of the organization', HttpStatus.BAD_REQUEST);
    }

    const org = await this._orgRepository.getById(orgId);
    if (!org) {
      throw new HttpException('Organization does not exists', HttpStatus.BAD_REQUEST);
    }

    return this._orgRepository.createOrgInvite(org, email);
  }

  async getPendingOrgInvite(email: string) {
    return this._orgRepository.getPendingOrgInviteByEmail(email);
  }

  async declineOrgInvite(id: string, email: string) {
    await this._orgRepository.deleteOrgInvite(id, email);
  }

  async acceptOrgInvite(id: string, userId: string, email: string) {
    const orgInvite = await this._orgRepository.getOrgInviteByIdAndEmail(id, email);
    if (!orgInvite) {
      throw new HttpException('Invite does not exists', HttpStatus.BAD_REQUEST);
    }

    const org = await this._orgRepository.getById(orgInvite.org);
    if (!org) {
      throw new HttpException('Organization does not exists', HttpStatus.BAD_REQUEST);
    }

    await this._usersService.addOrg(userId, org);
    await this._orgRepository.updateOrgInviteStatus(id, OrgInviteStatus.ACCEPTED);
  }
}
