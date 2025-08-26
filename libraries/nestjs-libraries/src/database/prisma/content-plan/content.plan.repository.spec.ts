import { Test, TestingModule } from '@nestjs/testing';
import { ContentPlanRepository } from './content.plan.repository';
import { PrismaRepository } from '../prisma.service';
import { ContentPlanStatus } from '@prisma/client';
import {
  GenerateContentPlanDto,
  CustomizeContentPlanDto,
  SaveTemplateDto
} from '../../../dtos/content-automation/request.dtos';
import {
  WeeklySchedule,
  PlatformConfig,
  Platform,
  PostType,
  ContentCategory,
  ToneOfVoice
} from '../../../dtos/content-automation/interfaces';

describe('ContentPlanRepository', () => {
  let repository: ContentPlanRepository;
  let mockPrismaRepository: jest.Mocked<PrismaRepository<'contentPlan'>>;

  const mockContentPlan = {
    id: 'plan-1',
    name: 'Test Plan',
    companyProfileId: 'profile-1',
    organizationId: 'org-1',
    status: ContentPlanStatus.DRAFT,
    weeklySchedule: {},
    platformConfig: {},
    isTemplate: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    activatedAt: null,
  };

  const mockWeeklySchedule: WeeklySchedule = {
    monday: {
      posts: [{
        id: 'post-1',
        platform: Platform.TWITTER,
        postType: PostType.TWEET,
        contentCategory: ContentCategory.EDUCATIONAL,
        toneOfVoice: ToneOfVoice.PROFESSIONAL,
        scheduledTime: '09:00',
        isLocked: false,
      }],
    },
  };

  const mockPlatformConfig: PlatformConfig = {
    [Platform.TWITTER]: {
      enabled: true,
      postTypes: [PostType.TWEET, PostType.THREAD],
      optimalTimes: ['09:00', '15:00'],
      dailyLimit: 5,
    },
  };

  beforeEach(async () => {
    const mockPrismaModel = {
      contentPlan: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
    };

    mockPrismaRepository = {
      model: mockPrismaModel,
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentPlanRepository,
        {
          provide: PrismaRepository,
          useValue: mockPrismaRepository,
        },
      ],
    }).compile();

    repository = module.get<ContentPlanRepository>(ContentPlanRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPlan', () => {
    it('should create a new content plan', async () => {
      const generateDto: GenerateContentPlanDto = {
        name: 'Test Plan',
        companyProfileId: 'profile-1',
        preferences: {
          platforms: [Platform.TWITTER],
        },
      };

      (mockPrismaRepository.model.contentPlan.create as jest.Mock).mockResolvedValue(mockContentPlan);

      const result = await repository.createPlan(
        'org-1',
        'profile-1',
        generateDto,
        mockWeeklySchedule,
        mockPlatformConfig
      );

      expect(mockPrismaRepository.model.contentPlan.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Plan',
          companyProfileId: 'profile-1',
          organizationId: 'org-1',
          weeklySchedule: mockWeeklySchedule,
          platformConfig: mockPlatformConfig,
          status: ContentPlanStatus.DRAFT,
          isTemplate: false,
        },
      });
      expect(result).toEqual(mockContentPlan);
    });
  });

  describe('updatePlan', () => {
    it('should update a content plan', async () => {
      const updateData = { name: 'Updated Plan' };
      const updatedPlan = { ...mockContentPlan, ...updateData };

      (mockPrismaRepository.model.contentPlan.update as jest.Mock).mockResolvedValue(updatedPlan);

      const result = await repository.updatePlan('plan-1', updateData);

      expect(mockPrismaRepository.model.contentPlan.update).toHaveBeenCalledWith({
        where: { id: 'plan-1' },
        data: {
          ...updateData,
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(updatedPlan);
    });
  });

  describe('customizePlan', () => {
    it('should customize a content plan with weekly schedule', async () => {
      const customizeDto: CustomizeContentPlanDto = {
        weeklySchedule: mockWeeklySchedule,
        modifications: [],
      };

      (mockPrismaRepository.model.contentPlan.update as jest.Mock).mockResolvedValue(mockContentPlan);

      const result = await repository.customizePlan('plan-1', customizeDto);

      expect(mockPrismaRepository.model.contentPlan.update).toHaveBeenCalledWith({
        where: { id: 'plan-1' },
        data: {
          weeklySchedule: mockWeeklySchedule,
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(mockContentPlan);
    });

    it('should customize a content plan with platform config', async () => {
      const customizeDto: CustomizeContentPlanDto = {
        platformConfig: mockPlatformConfig,
        modifications: [],
      };

      (mockPrismaRepository.model.contentPlan.update as jest.Mock).mockResolvedValue(mockContentPlan);

      const result = await repository.customizePlan('plan-1', customizeDto);

      expect(mockPrismaRepository.model.contentPlan.update).toHaveBeenCalledWith({
        where: { id: 'plan-1' },
        data: {
          platformConfig: mockPlatformConfig,
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(mockContentPlan);
    });
  });

  describe('getPlanById', () => {
    it('should get a content plan by id with relations', async () => {
      const planWithRelations = {
        ...mockContentPlan,
        companyProfile: { id: 'profile-1', name: 'Test Profile' },
        automationLogs: [],
      };

      (mockPrismaRepository.model.contentPlan.findUnique as jest.Mock).mockResolvedValue(planWithRelations);

      const result = await repository.getPlanById('plan-1');

      expect(mockPrismaRepository.model.contentPlan.findUnique).toHaveBeenCalledWith({
        where: { id: 'plan-1' },
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
      expect(result).toEqual(planWithRelations);
    });

    it('should return null if plan not found', async () => {
      (mockPrismaRepository.model.contentPlan.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.getPlanById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getPlansByOrganization', () => {
    it('should get all plans for an organization', async () => {
      const plans = [mockContentPlan];
      (mockPrismaRepository.model.contentPlan.findMany as jest.Mock).mockResolvedValue(plans);

      const result = await repository.getPlansByOrganization('org-1');

      expect(mockPrismaRepository.model.contentPlan.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
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
      expect(result).toEqual(plans);
    });
  });

  describe('getActivePlan', () => {
    it('should get the active plan for an organization', async () => {
      const activePlan = { ...mockContentPlan, status: ContentPlanStatus.ACTIVE };
      (mockPrismaRepository.model.contentPlan.findFirst as jest.Mock).mockResolvedValue(activePlan);

      const result = await repository.getActivePlan('org-1');

      expect(mockPrismaRepository.model.contentPlan.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
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
            take: 5,
          },
        },
      });
      expect(result).toEqual(activePlan);
    });

    it('should return null if no active plan exists', async () => {
      (mockPrismaRepository.model.contentPlan.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repository.getActivePlan('org-1');

      expect(result).toBeNull();
    });
  });

  describe('activatePlan', () => {
    it('should activate a content plan', async () => {
      const activatedPlan = {
        ...mockContentPlan,
        status: ContentPlanStatus.ACTIVE,
        activatedAt: new Date(),
      };

      (mockPrismaRepository.model.contentPlan.update as jest.Mock).mockResolvedValue(activatedPlan);

      const result = await repository.activatePlan('plan-1');

      expect(mockPrismaRepository.model.contentPlan.update).toHaveBeenCalledWith({
        where: { id: 'plan-1' },
        data: {
          status: ContentPlanStatus.ACTIVE,
          activatedAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(activatedPlan);
    });
  });

  describe('deactivatePlan', () => {
    it('should deactivate a content plan', async () => {
      const deactivatedPlan = {
        ...mockContentPlan,
        status: ContentPlanStatus.PAUSED,
      };

      (mockPrismaRepository.model.contentPlan.update as jest.Mock).mockResolvedValue(deactivatedPlan);

      const result = await repository.deactivatePlan('plan-1');

      expect(mockPrismaRepository.model.contentPlan.update).toHaveBeenCalledWith({
        where: { id: 'plan-1' },
        data: {
          status: ContentPlanStatus.PAUSED,
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(deactivatedPlan);
    });
  });

  describe('deactivateAllPlansForOrganization', () => {
    it('should deactivate all active plans for an organization', async () => {
      (mockPrismaRepository.model.contentPlan.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      await repository.deactivateAllPlansForOrganization('org-1');

      expect(mockPrismaRepository.model.contentPlan.updateMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          status: ContentPlanStatus.ACTIVE,
        },
        data: {
          status: ContentPlanStatus.PAUSED,
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe('saveAsTemplate', () => {
    it('should save a plan as template', async () => {
      const templateData: SaveTemplateDto = {
        name: 'My Template',
        description: 'Test template',
      };

      const originalPlan = { ...mockContentPlan };
      const templatePlan = {
        ...mockContentPlan,
        id: 'template-1',
        name: 'My Template',
        isTemplate: true,
      };

      (mockPrismaRepository.model.contentPlan.findUnique as jest.Mock).mockResolvedValue(originalPlan);
      (mockPrismaRepository.model.contentPlan.create as jest.Mock).mockResolvedValue(templatePlan);

      const result = await repository.saveAsTemplate('plan-1', templateData);

      expect(mockPrismaRepository.model.contentPlan.create).toHaveBeenCalledWith({
        data: {
          name: 'My Template',
          companyProfileId: originalPlan.companyProfileId,
          organizationId: originalPlan.organizationId,
          weeklySchedule: originalPlan.weeklySchedule,
          platformConfig: originalPlan.platformConfig,
          status: ContentPlanStatus.DRAFT,
          isTemplate: true,
        },
      });
      expect(result).toEqual(templatePlan);
    });

    it('should throw error if original plan not found', async () => {
      (mockPrismaRepository.model.contentPlan.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        repository.saveAsTemplate('nonexistent', { name: 'Template' })
      ).rejects.toThrow('Content plan not found');
    });
  });

  describe('deletePlan', () => {
    it('should delete a content plan', async () => {
      (mockPrismaRepository.model.contentPlan.delete as jest.Mock).mockResolvedValue(mockContentPlan);

      const result = await repository.deletePlan('plan-1');

      expect(mockPrismaRepository.model.contentPlan.delete).toHaveBeenCalledWith({
        where: { id: 'plan-1' },
      });
      expect(result).toEqual(mockContentPlan);
    });
  });

  describe('countPlansByOrganization', () => {
    it('should count plans for an organization', async () => {
      (mockPrismaRepository.model.contentPlan.count as jest.Mock).mockResolvedValue(5);

      const result = await repository.countPlansByOrganization('org-1');

      expect(mockPrismaRepository.model.contentPlan.count).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          isTemplate: false,
        },
      });
      expect(result).toBe(5);
    });
  });

  describe('findPlanByNameAndOrganization', () => {
    it('should find a plan by name and organization', async () => {
      (mockPrismaRepository.model.contentPlan.findFirst as jest.Mock).mockResolvedValue(mockContentPlan);

      const result = await repository.findPlanByNameAndOrganization('Test Plan', 'org-1');

      expect(mockPrismaRepository.model.contentPlan.findFirst).toHaveBeenCalledWith({
        where: {
          name: 'Test Plan',
          organizationId: 'org-1',
        },
      });
      expect(result).toEqual(mockContentPlan);
    });

    it('should return null if plan not found', async () => {
      (mockPrismaRepository.model.contentPlan.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repository.findPlanByNameAndOrganization('Nonexistent', 'org-1');

      expect(result).toBeNull();
    });
  });

  describe('getPlansByStatus', () => {
    it('should get plans by status', async () => {
      const plans = [{ ...mockContentPlan, status: ContentPlanStatus.ACTIVE }];
      (mockPrismaRepository.model.contentPlan.findMany as jest.Mock).mockResolvedValue(plans);

      const result = await repository.getPlansByStatus('org-1', ContentPlanStatus.ACTIVE);

      expect(mockPrismaRepository.model.contentPlan.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
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
            take: 1,
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });
      expect(result).toEqual(plans);
    });
  });

  describe('getTemplatesByOrganization', () => {
    it('should get templates for an organization', async () => {
      const templates = [{ ...mockContentPlan, isTemplate: true }];
      (mockPrismaRepository.model.contentPlan.findMany as jest.Mock).mockResolvedValue(templates);

      const result = await repository.getTemplatesByOrganization('org-1');

      expect(mockPrismaRepository.model.contentPlan.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          isTemplate: true,
        },
        include: {
          companyProfile: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });
      expect(result).toEqual(templates);
    });
  });

  describe('duplicatePlan', () => {
    it('should duplicate a plan with new name', async () => {
      const originalPlan = { ...mockContentPlan };
      const duplicatedPlan = { ...mockContentPlan, id: 'plan-2', name: 'Duplicated Plan' };

      (mockPrismaRepository.model.contentPlan.findUnique as jest.Mock).mockResolvedValue(originalPlan);
      (mockPrismaRepository.model.contentPlan.create as jest.Mock).mockResolvedValue(duplicatedPlan);

      const result = await repository.duplicatePlan('plan-1', 'Duplicated Plan');

      expect(mockPrismaRepository.model.contentPlan.create).toHaveBeenCalledWith({
        data: {
          name: 'Duplicated Plan',
          companyProfileId: originalPlan.companyProfileId,
          organizationId: originalPlan.organizationId,
          weeklySchedule: originalPlan.weeklySchedule,
          platformConfig: originalPlan.platformConfig,
          status: ContentPlanStatus.DRAFT,
          isTemplate: false,
        },
      });
      expect(result).toEqual(duplicatedPlan);
    });

    it('should throw error if original plan not found', async () => {
      (mockPrismaRepository.model.contentPlan.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        repository.duplicatePlan('nonexistent', 'New Name')
      ).rejects.toThrow('Content plan not found');
    });
  });

  describe('updatePlanStatus', () => {
    it('should update plan status', async () => {
      const updatedPlan = { ...mockContentPlan, status: ContentPlanStatus.ACTIVE };
      (mockPrismaRepository.model.contentPlan.update as jest.Mock).mockResolvedValue(updatedPlan);

      const result = await repository.updatePlanStatus('plan-1', ContentPlanStatus.ACTIVE);

      expect(mockPrismaRepository.model.contentPlan.update).toHaveBeenCalledWith({
        where: { id: 'plan-1' },
        data: {
          status: ContentPlanStatus.ACTIVE,
          updatedAt: expect.any(Date),
          activatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(updatedPlan);
    });

    it('should update plan status without activatedAt for non-active status', async () => {
      const updatedPlan = { ...mockContentPlan, status: ContentPlanStatus.PAUSED };
      (mockPrismaRepository.model.contentPlan.update as jest.Mock).mockResolvedValue(updatedPlan);

      const result = await repository.updatePlanStatus('plan-1', ContentPlanStatus.PAUSED);

      expect(mockPrismaRepository.model.contentPlan.update).toHaveBeenCalledWith({
        where: { id: 'plan-1' },
        data: {
          status: ContentPlanStatus.PAUSED,
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(updatedPlan);
    });
  });

  describe('countTemplatesByOrganization', () => {
    it('should count templates for an organization', async () => {
      (mockPrismaRepository.model.contentPlan.count as jest.Mock).mockResolvedValue(3);

      const result = await repository.countTemplatesByOrganization('org-1');

      expect(mockPrismaRepository.model.contentPlan.count).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          isTemplate: true,
        },
      });
      expect(result).toBe(3);
    });
  });

  describe('getPlansByCompanyProfile', () => {
    it('should get plans by company profile', async () => {
      const plans = [mockContentPlan];
      (mockPrismaRepository.model.contentPlan.findMany as jest.Mock).mockResolvedValue(plans);

      const result = await repository.getPlansByCompanyProfile('profile-1');

      expect(mockPrismaRepository.model.contentPlan.findMany).toHaveBeenCalledWith({
        where: {
          companyProfileId: 'profile-1',
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
      expect(result).toEqual(plans);
    });
  });
});