import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { 
  GenerateContentPlanDto, 
  CustomizeContentPlanDto, 
  SaveTemplateDto 
} from '@gitroom/nestjs-libraries/dtos/content-automation/request.dtos';
import { ContentPlan, ContentPlanStatus } from '@prisma/client';
import { WeeklySchedule, PlatformConfig } from '@gitroom/nestjs-libraries/dtos/content-automation/interfaces';

@Injectable()
export class ContentPlanRepository {
  constructor(
    private _contentPlan: PrismaRepository<'contentPlan'>,
  ) {}

  async createPlan(
    organizationId: string, 
    companyProfileId: string, 
    data: GenerateContentPlanDto,
    weeklySchedule: WeeklySchedule,
    platformConfig: PlatformConfig
  ): Promise<ContentPlan> {
    return this._contentPlan.model.contentPlan.create({
      data: {
        name: data.name,
        companyProfileId,
        organizationId,
        weeklySchedule: weeklySchedule as any,
        platformConfig: platformConfig as any,
        status: ContentPlanStatus.DRAFT,
        isTemplate: false,
      },
    });
  }

  async updatePlan(id: string, data: Partial<ContentPlan>): Promise<ContentPlan> {
    return this._contentPlan.model.contentPlan.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async customizePlan(
    id: string, 
    data: CustomizeContentPlanDto
  ): Promise<ContentPlan> {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.weeklySchedule) {
      updateData.weeklySchedule = data.weeklySchedule;
    }

    if (data.platformConfig) {
      updateData.platformConfig = data.platformConfig;
    }

    return this._contentPlan.model.contentPlan.update({
      where: { id },
      data: updateData,
    });
  }

  async getPlanById(id: string): Promise<ContentPlan | null> {
    return this._contentPlan.model.contentPlan.findUnique({
      where: { id },
      include: {
        companyProfile: true,
        automationLogs: {
          include: {
            logEntries: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  }

  async getPlansByOrganization(organizationId: string): Promise<ContentPlan[]> {
    return this._contentPlan.model.contentPlan.findMany({
      where: {
        organizationId,
        isTemplate: false,
      },
      include: {
        companyProfile: true,
        automationLogs: {
          include: {
            logEntries: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1, // Only get the latest log for list view
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async getTemplatesByOrganization(organizationId: string): Promise<ContentPlan[]> {
    return this._contentPlan.model.contentPlan.findMany({
      where: {
        organizationId,
        isTemplate: true,
      },
      include: {
        companyProfile: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async getActivePlan(organizationId: string): Promise<ContentPlan | null> {
    return this._contentPlan.model.contentPlan.findFirst({
      where: {
        organizationId,
        status: ContentPlanStatus.ACTIVE,
        isTemplate: false,
      },
      include: {
        companyProfile: true,
        automationLogs: {
          include: {
            logEntries: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5, // Get recent logs for active plan
        },
      },
    });
  }

  async activatePlan(id: string): Promise<ContentPlan> {
    return this._contentPlan.model.contentPlan.update({
      where: { id },
      data: {
        status: ContentPlanStatus.ACTIVE,
        activatedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async deactivatePlan(id: string): Promise<ContentPlan> {
    return this._contentPlan.model.contentPlan.update({
      where: { id },
      data: {
        status: ContentPlanStatus.PAUSED,
        updatedAt: new Date(),
      },
    });
  }

  async deactivateAllPlansForOrganization(organizationId: string): Promise<void> {
    await this._contentPlan.model.contentPlan.updateMany({
      where: {
        organizationId,
        status: ContentPlanStatus.ACTIVE,
      },
      data: {
        status: ContentPlanStatus.PAUSED,
        updatedAt: new Date(),
      },
    });
  }

  async deletePlan(id: string): Promise<ContentPlan> {
    return this._contentPlan.model.contentPlan.delete({
      where: { id },
    });
  }

  async saveAsTemplate(id: string, templateData: SaveTemplateDto): Promise<ContentPlan> {
    const originalPlan = await this.getPlanById(id);
    if (!originalPlan) {
      throw new Error('Content plan not found');
    }

    return this._contentPlan.model.contentPlan.create({
      data: {
        name: templateData.name,
        companyProfileId: originalPlan.companyProfileId,
        organizationId: originalPlan.organizationId,
        weeklySchedule: originalPlan.weeklySchedule,
        platformConfig: originalPlan.platformConfig,
        status: ContentPlanStatus.DRAFT,
        isTemplate: true,
      },
    });
  }

  async duplicatePlan(id: string, newName: string): Promise<ContentPlan> {
    const originalPlan = await this.getPlanById(id);
    if (!originalPlan) {
      throw new Error('Content plan not found');
    }

    return this._contentPlan.model.contentPlan.create({
      data: {
        name: newName,
        companyProfileId: originalPlan.companyProfileId,
        organizationId: originalPlan.organizationId,
        weeklySchedule: originalPlan.weeklySchedule,
        platformConfig: originalPlan.platformConfig,
        status: ContentPlanStatus.DRAFT,
        isTemplate: false,
      },
    });
  }

  async updatePlanStatus(id: string, status: ContentPlanStatus): Promise<ContentPlan> {
    return this._contentPlan.model.contentPlan.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date(),
        ...(status === ContentPlanStatus.ACTIVE && { activatedAt: new Date() }),
      },
    });
  }

  async countPlansByOrganization(organizationId: string): Promise<number> {
    return this._contentPlan.model.contentPlan.count({
      where: {
        organizationId,
        isTemplate: false,
      },
    });
  }

  async countTemplatesByOrganization(organizationId: string): Promise<number> {
    return this._contentPlan.model.contentPlan.count({
      where: {
        organizationId,
        isTemplate: true,
      },
    });
  }

  async findPlanByNameAndOrganization(
    name: string, 
    organizationId: string
  ): Promise<ContentPlan | null> {
    return this._contentPlan.model.contentPlan.findFirst({
      where: {
        name,
        organizationId,
      },
    });
  }

  async getPlansByStatus(
    organizationId: string, 
    status: ContentPlanStatus
  ): Promise<ContentPlan[]> {
    return this._contentPlan.model.contentPlan.findMany({
      where: {
        organizationId,
        status,
        isTemplate: false,
      },
      include: {
        companyProfile: true,
        automationLogs: {
          include: {
            logEntries: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async getPlansByCompanyProfile(companyProfileId: string): Promise<ContentPlan[]> {
    return this._contentPlan.model.contentPlan.findMany({
      where: {
        companyProfileId,
        isTemplate: false,
      },
      include: {
        companyProfile: true,
        automationLogs: {
          include: {
            logEntries: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }
}