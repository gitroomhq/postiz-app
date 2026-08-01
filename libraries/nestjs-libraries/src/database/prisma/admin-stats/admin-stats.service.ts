import { Injectable } from '@nestjs/common';
import {
  AdminStatsRepository,
  StatsParams,
} from '@gitroom/nestjs-libraries/database/prisma/admin-stats/admin-stats.repository';

@Injectable()
export class AdminStatsService {
  constructor(private _adminStatsRepository: AdminStatsRepository) {}

  getStats(params: StatsParams) {
    return this._adminStatsRepository.getStats(params);
  }
}
