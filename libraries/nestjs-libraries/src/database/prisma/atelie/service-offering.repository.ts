import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

const OFFERING_SELECT = {
  id: true,
  slug: true,
  name: true,
  category: true,
  deliveryMode: true,
  optionsSchema: true,
} as const;

@Injectable()
export class ServiceOfferingRepository {
  constructor(private _offering: PrismaRepository<'serviceOffering'>) {}

  listActive() {
    return this._offering.model.serviceOffering.findMany({
      where: { active: true },
      select: OFFERING_SELECT,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  getBySlug(slug: string) {
    return this._offering.model.serviceOffering.findFirst({
      where: { slug, active: true },
      select: OFFERING_SELECT,
    });
  }
}
