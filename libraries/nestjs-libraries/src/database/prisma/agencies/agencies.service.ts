import { Injectable } from '@nestjs/common';
import { AgenciesRepository } from '@gitroom/nestjs-libraries/database/prisma/agencies/agencies.repository';
import { User } from '@prisma/client';

@Injectable()
export class AgenciesService {
  constructor(private _agenciesRepository: AgenciesRepository) {}
  getAgencyByUser(user: User) {
    return this._agenciesRepository.getAgencyByUser(user);
  }
}
