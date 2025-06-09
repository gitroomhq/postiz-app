import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { SetsDto } from '@gitroom/nestjs-libraries/dtos/sets/sets.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SetsRepository {
  constructor(private _sets: PrismaRepository<'sets'>) {}

  getTotal(orgId: string) {
    return this._sets.model.sets.count({
      where: {
        organizationId: orgId,
      },
    });
  }

  getSets(orgId: string) {
    return this._sets.model.sets.findMany({
      where: {
        organizationId: orgId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  deleteSet(orgId: string, id: string) {
    return this._sets.model.sets.delete({
      where: {
        id,
        organizationId: orgId,
      },
    });
  }

  async createSet(orgId: string, body: SetsDto) {
    const { id } = await this._sets.model.sets.upsert({
      where: {
        id: body.id || uuidv4(),
        organizationId: orgId,
      },
      create: {
        id: body.id || uuidv4(),
        organizationId: orgId,
        name: body.name,
        content: body.content,
      },
      update: {
        name: body.name,
        content: body.content,
      },
    });

    return { id };
  }
} 