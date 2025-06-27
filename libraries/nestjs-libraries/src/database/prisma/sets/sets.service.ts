import { Injectable } from '@nestjs/common';
import { SetsRepository } from '@chaolaolo/nestjs-libraries/database/prisma/sets/sets.repository';
import { SetsDto } from '@chaolaolo/nestjs-libraries/dtos/sets/sets.dto';

@Injectable()
export class SetsService {
  constructor(private _setsRepository: SetsRepository) { }

  getTotal(orgId: string) {
    return this._setsRepository.getTotal(orgId);
  }

  getSets(orgId: string) {
    return this._setsRepository.getSets(orgId);
  }

  createSet(orgId: string, body: SetsDto) {
    return this._setsRepository.createSet(orgId, body);
  }

  deleteSet(orgId: string, id: string) {
    return this._setsRepository.deleteSet(orgId, id);
  }
} 