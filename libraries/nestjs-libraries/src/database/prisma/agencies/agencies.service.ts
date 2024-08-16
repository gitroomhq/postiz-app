import { Injectable } from '@nestjs/common';
import { AgenciesRepository } from '@gitroom/nestjs-libraries/database/prisma/agencies/agencies.repository';
import { User } from '@prisma/client';
import { CreateAgencyDto } from '@gitroom/nestjs-libraries/dtos/agencies/create.agency.dto';

@Injectable()
export class AgenciesService {
  constructor(private _agenciesRepository: AgenciesRepository) {}
  getAgencyByUser(user: User) {
    return this._agenciesRepository.getAgencyByUser(user);
  }

  createAgency(user: User, body: CreateAgencyDto) {
    return this._agenciesRepository.createAgency(user, body);
  }
}
