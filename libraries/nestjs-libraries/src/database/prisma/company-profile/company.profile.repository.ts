import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { CompanyProfileDto } from '@gitroom/nestjs-libraries/dtos/company-profile/company.profile.dto';

@Injectable()
export class CompanyProfileRepository {
  constructor(
    private _companyProfile: PrismaRepository<'companyProfile'>,
    private _offering: PrismaRepository<'offering'>,
  ) {}

  createProfile(body: CompanyProfileDto) {
    return this._companyProfile.model.companyProfile.create({
      data: {
        id: uuidv4(),
        name: body.name,
        industry: body.industry,
        description: body.description,
        website: body.website,
        toneOfVoice: body.toneOfVoice,
        targetAudience: body.targetAudience,
        brandColor: body.brandColor,
        offerings:{
          create: body.offerings.map((Offering) => ({
            id: uuidv4(),
            name: Offering.name,
            type: Offering.type,
            keyFeature: Offering.keyFeature,
          })),
        },
        },
      });
    }
  updateProfile(body: CompanyProfileDto,id: string) {
    return this._companyProfile.model.companyProfile.update({
      where: {
        id,
      },
      data: {
        name: body.name,
        industry: body.industry,
        description: body.description,
        website: body.website,
        toneOfVoice: body.toneOfVoice,
        targetAudience: body.targetAudience,
        brandColor: body.brandColor,
        // offerings:{
        //   update: body.offerings.map((Offering) => ({
        //     id: uuidv4(),
        //     name: Offering.name,
        //     type: Offering.type,
        //     keyFeature: Offering.keyFeature,
        //   })),
        // },
      },
    });
  }
  getCompanyProfiles(id: string, body: CompanyProfileDto) {
    return this._companyProfile.model.companyProfile.findMany({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        industry: true,
        description: true,
        website: true,
        toneOfVoice: true,
        targetAudience: true,
        brandColor: true,
        offerings: {
          select: {
            id: true,
            name: true,
            keyFeature: true,
          },
        },
      },
    });
  }
}
