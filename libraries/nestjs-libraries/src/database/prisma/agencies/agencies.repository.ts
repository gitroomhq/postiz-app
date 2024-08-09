import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';

@Injectable()
export class AgenciesRepository {
  constructor(
    private _socialMediaAgencies: PrismaRepository<'socialMediaAgency'>
  ) {}

  getAgencyByUser(user: User) {
    return this._socialMediaAgencies.model.socialMediaAgency.findFirst({
      where: {
        userId: user.id,
        deletedAt: null,
      },
    });
  }
}
