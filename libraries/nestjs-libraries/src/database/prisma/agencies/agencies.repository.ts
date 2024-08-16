import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { CreateAgencyDto } from '@gitroom/nestjs-libraries/dtos/agencies/create.agency.dto';

@Injectable()
export class AgenciesRepository {
  constructor(
    private _socialMediaAgencies: PrismaRepository<'socialMediaAgency'>,
    private _socialMediaAgenciesNiche: PrismaRepository<'socialMediaAgencyNiche'>
  ) {}

  getAgencyByUser(user: User) {
    return this._socialMediaAgencies.model.socialMediaAgency.findFirst({
      where: {
        userId: user.id,
        deletedAt: null,
      },
    });
  }

  async createAgency(user: User, body: CreateAgencyDto) {
    const insertAgency =
      await this._socialMediaAgencies.model.socialMediaAgency.upsert({
        where: {
          userId: user.id,
        },
        update: {
          userId: user.id,
          name: body.name,
          website: body.website,
          facebook: body.facebook,
          instagram: body.instagram,
          twitter: body.twitter,
          linkedIn: body.linkedin,
          youtube: body.youtube,
          tiktok: body.tiktok,
          logoId: body.logo,
          shortDescription: body.shortDescription,
          description: body.description,
          niches: {
            create: body.niche.map((n) => ({
              niche: n,
            })),
          },
        },
        create: {
          userId: user.id,
          name: body.name,
          website: body.website,
          facebook: body.facebook,
          instagram: body.instagram,
          twitter: body.twitter,
          linkedIn: body.linkedin,
          youtube: body.youtube,
          tiktok: body.tiktok,
          logoId: body.logo,
          shortDescription: body.shortDescription,
          description: body.description,
        },
        select: {
          id: true,
        },
      });

    await this._socialMediaAgenciesNiche.model.socialMediaAgencyNiche.deleteMany(
      {
        where: {
          agencyId: insertAgency.id,
          niche: {
            notIn: body.niche,
          },
        },
      }
    );

    const currentNiche =
      await this._socialMediaAgenciesNiche.model.socialMediaAgencyNiche.findMany(
        {
          where: {
            agencyId: insertAgency.id,
          },
          select: {
            niche: true,
          },
        }
      );

    const addNewNiche = body.niche.filter(
      (n) => !currentNiche.some((c) => c.niche === n)
    );

    await this._socialMediaAgenciesNiche.model.socialMediaAgencyNiche.createMany(
      {
        data: addNewNiche.map((n) => ({
          agencyId: insertAgency.id,
          niche: n,
        })),
      }
    );

    return insertAgency;
  }
}
