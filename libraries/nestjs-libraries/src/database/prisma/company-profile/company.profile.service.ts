import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { CompanyProfileRepository } from './company.profile.repository';
import { ContentPlanRepository } from '../content-plan/content.plan.repository';
import { CreateCompanyProfileDto, UpdateCompanyProfileDto } from '@gitroom/nestjs-libraries/dtos/content-automation/request.dtos';
import { CompanyProfileResponseDto, CompanyProfileListResponseDto } from '@gitroom/nestjs-libraries/dtos/content-automation/response.dtos';
import { ProductService, CompetitorInfo, MarketingGoal } from '@gitroom/nestjs-libraries/dtos/content-automation/interfaces';
import { CompanyProfileAI } from '@prisma/client';

@Injectable()
export class CompanyProfileService {
  private readonly MAX_PROFILES_PER_ORG = 10;

  constructor(
    private readonly companyProfileRepository: CompanyProfileRepository,
    private readonly contentPlanRepository: ContentPlanRepository,
  ) { }

  private fromJsonValue<T>(value: unknown): T {
    return value as T;
  }

  async createProfile(organizationId: string, data: CreateCompanyProfileDto): Promise<CompanyProfileResponseDto> {
    const profileCount = await this.companyProfileRepository.countProfilesByOrganization(organizationId);
    if (profileCount >= this.MAX_PROFILES_PER_ORG) {
      throw new BadRequestException(`Maximum number of company profiles (${this.MAX_PROFILES_PER_ORG}) reached for this organization`);
    }

    const existingProfile = await this.companyProfileRepository.findProfileByNameAndOrganization(data.name, organizationId);
    if (existingProfile) {
      throw new ConflictException(`A company profile with the name "${data.name}" already exists`);
    }

    this.validateProfileData(data);

    const profile = await this.companyProfileRepository.createProfile(organizationId, data);
    return this.mapToResponseDto(profile);
  }

  async updateProfile(id: string, organizationId: string, data: UpdateCompanyProfileDto): Promise<CompanyProfileResponseDto> {
    const existingProfile = await this.companyProfileRepository.getProfileById(id);
    if (!existingProfile) {
      throw new NotFoundException('Company profile not found');
    }
    if (existingProfile.organizationId !== organizationId) {
      throw new NotFoundException('Company profile not found');
    }

    if (data.name && data.name !== existingProfile.name) {
      const conflictingProfile = await this.companyProfileRepository.findProfileByNameAndOrganization(data.name, organizationId);
      if (conflictingProfile && conflictingProfile.id !== id) {
        throw new ConflictException(`A company profile with the name "${data.name}" already exists`);
      }
    }

    if (data.name || data.industry || data.targetAudience || data.usp || data.brandVoice) {
      this.validateProfileData(data as CreateCompanyProfileDto);
    }

    const updatedProfile = await this.companyProfileRepository.updateProfile(id, data);
    return this.mapToResponseDto(updatedProfile);
  }

  async getProfileById(id: string, organizationId: string): Promise<CompanyProfileResponseDto> {
    const profile = await this.companyProfileRepository.getProfileById(id);
    if (!profile || profile.organizationId !== organizationId) {
      throw new NotFoundException('Company profile not found');
    }
    return this.mapToResponseDto(profile);
  }

  async getProfiles(organizationId: string): Promise<CompanyProfileListResponseDto> {
    const [profiles, templates] = await Promise.all([
      this.companyProfileRepository.getProfilesByOrganization(organizationId),
      this.companyProfileRepository.getTemplatesByOrganization(organizationId),
    ]);

    return {
      profiles: profiles.map(profile => this.mapToResponseDto(profile)),
      total: profiles.length,
      templates: templates.map(template => this.mapToResponseDto(template)),
    };
  }

  async getAllProfiles(organizationId: string): Promise<CompanyProfileResponseDto[]> {
    const profiles = await this.companyProfileRepository.getAllProfilesByOrganization(organizationId);
    return profiles.map(profile => this.mapToResponseDto(profile));
  }

  async deleteProfile(id: string, organizationId: string): Promise<void> {
    const profile = await this.companyProfileRepository.getProfileById(id);
    if (!profile || profile.organizationId !== organizationId) {
      throw new NotFoundException('Company profile not found');
    }

    const associatedPlans = await this.contentPlanRepository.getPlansByCompanyProfile(id);
    if (associatedPlans.length > 0) {
      const activePlans = associatedPlans.filter(plan => plan.status === 'ACTIVE');
      if (activePlans.length > 0) {
        throw new BadRequestException(
          `Cannot delete company profile. It is currently being used by ${activePlans.length} active content plan(s). Please deactivate or delete the content plans first.`
        );
      }

      if (associatedPlans.length > 0) {
        throw new BadRequestException(
          `Cannot delete company profile. It is being used by ${associatedPlans.length} content plan(s). Please delete the content plans first.`
        );
      }
    }

    await this.companyProfileRepository.deleteProfile(id);
  }

  async saveAsTemplate(id: string, organizationId: string): Promise<CompanyProfileResponseDto> {
    const profile = await this.companyProfileRepository.getProfileById(id);
    if (!profile || profile.organizationId !== organizationId) {
      throw new NotFoundException('Company profile not found');
    }

    const templateProfile = await this.companyProfileRepository.saveAsTemplate(id);
    return this.mapToResponseDto(templateProfile);
  }

  async duplicateProfile(id: string, organizationId: string, newName: string): Promise<CompanyProfileResponseDto> {
    const profile = await this.companyProfileRepository.getProfileById(id);
    if (!profile || profile.organizationId !== organizationId) {
      throw new NotFoundException('Company profile not found');
    }

    const profileCount = await this.companyProfileRepository.countProfilesByOrganization(organizationId);
    if (profileCount >= this.MAX_PROFILES_PER_ORG) {
      throw new BadRequestException(`Maximum number of company profiles (${this.MAX_PROFILES_PER_ORG}) reached for this organization`);
    }

    const existingProfile = await this.companyProfileRepository.findProfileByNameAndOrganization(newName, organizationId);
    if (existingProfile) {
      throw new ConflictException(`A company profile with the name "${newName}" already exists`);
    }

    const duplicatedProfile = await this.companyProfileRepository.duplicateProfile(id, newName);
    return this.mapToResponseDto(duplicatedProfile);
  }

  async getTemplates(organizationId: string): Promise<CompanyProfileResponseDto[]> {
    const templates = await this.companyProfileRepository.getTemplatesByOrganization(organizationId);
    return templates.map(template => this.mapToResponseDto(template));
  }

  private validateProfileData(data: Partial<CreateCompanyProfileDto>): void {
    if (data.name && data.name.trim().length === 0) {
      throw new BadRequestException('Company name cannot be empty');
    }

    if (data.industry && data.industry.trim().length === 0) {
      throw new BadRequestException('Industry cannot be empty');
    }

    if (data.targetAudience && data.targetAudience.trim().length === 0) {
      throw new BadRequestException('Target audience cannot be empty');
    }

    if (data.usp && data.usp.trim().length === 0) {
      throw new BadRequestException('Unique selling proposition cannot be empty');
    }

    if (data.brandVoice && data.brandVoice.trim().length === 0) {
      throw new BadRequestException('Brand voice cannot be empty');
    }

    if (data.products && data.products.length === 0) {
      throw new BadRequestException('At least one product or service must be specified');
    }

    if (data.competitors && data.competitors.length === 0) {
      throw new BadRequestException('At least one competitor must be specified');
    }

    if (data.marketingGoals && data.marketingGoals.length === 0) {
      throw new BadRequestException('At least one marketing goal must be specified');
    }
  }

  private mapToResponseDto(profile: CompanyProfileAI): CompanyProfileResponseDto {
    return {
      id: profile.id,
      name: profile.name,
      industry: profile.industry,
      description: profile.description,
      products: this.fromJsonValue<ProductService[]>(profile.products),
      targetAudience: profile.targetAudience,
      competitors: this.fromJsonValue<CompetitorInfo[]>(profile.competitors),
      usp: profile.usp,
      brandVoice: profile.brandVoice,
      marketingGoals: this.fromJsonValue<MarketingGoal[]>(profile.marketingGoals),
      organizationId: profile.organizationId,
      isTemplate: profile.isTemplate,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}