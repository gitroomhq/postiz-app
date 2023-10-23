import { Injectable } from '@nestjs/common';
import { OrgRepository } from "@clickvote/backend/src/packages/org/org.repository";
import { UsersService } from "@clickvote/backend/src/packages/users/users.service";

@Injectable()
export class OrgService {
  constructor(
    private readonly _orgRepository: OrgRepository,
    private readonly _userService: UsersService,
  ) {
  }

  async getById(id: string) {
    return this._orgRepository.getById(id);
  }

  async createOrg(name: string) {
    return this._orgRepository.createOrg(name);
  }

  async updateOrg(id: string, name: string) {
    return this._orgRepository.updateOrg(id, name);
  }

  async getMembers(id: string) {
    return this._userService.getAllInOrg(id);
  }
}
