import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { CreateCompanyProfileDto, UpdateCompanyProfileDto } from '@gitroom/nestjs-libraries/dtos/content-automation/request.dtos';
import { CompanyProfileAI, Prisma } from '@prisma/client';

@Injectable()
export class CompanyProfileRepository {
  constructor(
    private _companyProfile: PrismaRepository<'companyProfileAI'>,
  ) { }

  private toJsonValue<T>(value: T): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  async createProfile(organizationId: string, data: CreateCompanyProfileDto): Promise<CompanyProfileAI> {
    return this._companyProfile.model.companyProfileAI.create({
      data: {
        name: data.name,
        industry: data.industry,
        description: data.description,
        products: this.toJsonValue(data.products),
        targetAudience: data.targetAudience,
        competitors: this.toJsonValue(data.competitors),
        usp: data.usp,
        brandVoice: data.brandVoice,
        marketingGoals: this.toJsonValue(data.marketingGoals),
        organizationId,
        isTemplate: data.isTemplate || false,
      },
    });
  }

  async updateProfile(id: string, data: UpdateCompanyProfileDto): Promise<CompanyProfileAI> {
    return this._companyProfile.model.companyProfileAI.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.industry && { industry: data.industry }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.products && { products: this.toJsonValue(data.products) }),
        ...(data.targetAudience && { targetAudience: data.targetAudience }),
        ...(data.competitors && { competitors: this.toJsonValue(data.competitors) }),
        ...(data.usp && { usp: data.usp }),
        ...(data.brandVoice && { brandVoice: data.brandVoice }),
        ...(data.marketingGoals && { marketingGoals: this.toJsonValue(data.marketingGoals) }),
        ...(data.isTemplate !== undefined && { isTemplate: data.isTemplate }),
        updatedAt: new Date(),
      },
    });
  }

  async getProfileById(id: string): Promise<CompanyProfileAI | null> {
    return this._companyProfile.model.companyProfileAI.findUnique({
      where: { id },
    });
  }

  async getProfilesByOrganization(organizationId: string): Promise<CompanyProfileAI[]> {
    return this._companyProfile.model.companyProfileAI.findMany({
      where: {
        organizationId,
        isTemplate: false,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async getTemplatesByOrganization(organizationId: string): Promise<CompanyProfileAI[]> {
    return this._companyProfile.model.companyProfileAI.findMany({
      where: {
        organizationId,
        isTemplate: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async getAllProfilesByOrganization(organizationId: string): Promise<CompanyProfileAI[]> {
    return this._companyProfile.model.companyProfileAI.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async deleteProfile(id: string): Promise<CompanyProfileAI> {
    return this._companyProfile.model.companyProfileAI.delete({
      where: { id },
    });
  }

  async saveAsTemplate(id: string): Promise<CompanyProfileAI> {
    return this._companyProfile.model.companyProfileAI.update({
      where: { id },
      data: {
        isTemplate: true,
        updatedAt: new Date(),
      },
    });
  }

  async countProfilesByOrganization(organizationId: string): Promise<number> {
    return this._companyProfile.model.companyProfileAI.count({
      where: {
        organizationId,
        isTemplate: false,
      },
    });
  }

  async findProfileByNameAndOrganization(name: string, organizationId: string): Promise<CompanyProfileAI | null> {
    return this._companyProfile.model.companyProfileAI.findFirst({
      where: {
        name,
        organizationId,
      },
    });
  }

  async duplicateProfile(id: string, newName: string): Promise<CompanyProfileAI> {
    const originalProfile = await this.getProfileById(id);
    if (!originalProfile) {
      throw new Error('Profile not found');
    }

    const { id: _, createdAt, updatedAt, ...profileData } = originalProfile;

    return this._companyProfile.model.companyProfileAI.create({
      data: {
        ...profileData,
        name: newName,
        isTemplate: false,
      },
    });
  }
}
