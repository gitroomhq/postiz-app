import { HttpException, Injectable } from '@nestjs/common';
import {OrgRepository} from "@clickvote/backend/src/packages/org/org.repository";

@Injectable()
export class OrgService {
  constructor(
    private readonly _orgRepository: OrgRepository,
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
}
