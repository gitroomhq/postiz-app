import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { ContentPlanService } from './content.plan.service';
import { ContentPlanRepository } from './content.plan.repository';
import { CompanyProfileService } from '../company-profile/company.profile.service';
import { ContentPlanStatus } from '@prisma/client';
import {
  GenerateContentPlanDto,
  CustomizeContentPlanDto,
  SaveTemplateDto
} from '../../../dtos/content-automation/request.dtos';
import {
  Platform,
  PostType,
  ContentCategory,
  ToneOfVoice
} from '../../../dtos/content-automation/interfaces';

describe('ContentPlanService', () => {
  let service: ContentPlanService;
  let mockContentPlanRepository: jest.Mocked<ContentPlanRepository>;
  let mockCompanyProfileService: jest.Mocked<CompanyProfileService>;

  const mockCompanyProfile = {
    id: 'profile-1',
    name: 'Test Company',
    organizationId: 'org-1',
    industry: 'Technology',
    description: 'Test company',
    products: [],
    targetAudience: 'Developers',
    competitors: [],
    usp: 'Best in class',
    brandVoice: 'Professional',
    marketingGoals: [],
    isTemplate: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockContentPlan = {
    id: 'plan-1',
    name: 'Test Plan',
    companyProfileId: 'profile-1',
    organizationId: 'org-1',
    status: ContentPlanStatus.DRAFT,
    weeklySchedule: {
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
    },
    platformConfig: {
      [Platform.TWITTER]: {
        enabled: true,
        postTypes: [PostType.TWEET, PostType.THREAD],
        optimalTimes: ['09:00', '15:00'],
        dailyLimit: 5,
      },
    },
    isTemplate: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    activatedAt: null,
    companyProfile: mockCompanyProfile,
    automationLogs: [],
  };

  beforeEach(async () => {
    const mockRepository = {
      createPlan: jest.fn(),
      updatePlan: jest.fn(),
      customizePlan: jest.fn(),
      getPlanById: jest.fn(),
      getPlansByOrganization: jest.fn(),
      getTemplatesByOrganization: jest.fn(),
      getActivePlan: jest.fn(),
      activatePlan: jest.fn(),
      deactivatePlan: jest.fn(),
      deactivateAllPlansForOrganization: jest.fn(),
      deletePlan: jest.fn(),
      saveAsTemplate: jest.fn(),
      duplicatePlan: jest.fn(),
      countPlansByOrganization: jest.fn(),
      findPlanByNameAndOrganization: jest.fn(),
      getPlansByStatus: jest.fn(),
      getPlansByCompanyProfile: jest.fn(),
    };

    const mockProfileService = {
      getProfileById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentPlanService,
        {
          provide: ContentPlanRepository,
          useValue: mockRepository,
        },
        {
          provide: CompanyProfileService,
          useValue: mockProfileService,
        },
      ],
    }).compile();

    service = module.get<ContentPlanService>(ContentPlanService);
    mockContentPlanRepository = module.get(ContentPlanRepository);
    mockCompanyProfileService = module.get(CompanyProfileService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generatePlan', () => {
    const generateDto: GenerateContentPlanDto = {
      name: 'Test Plan',
      companyProfileId: 'profile-1',
      preferences: {
        platforms: [Platform.TWITTER],
        preferredPostTypes: [PostType.TWEET],
        preferredCategories: [ContentCategory.EDUCATIONAL],
        defaultToneOfVoice: ToneOfVoice.PROFESSIONAL,
      },
    };

    it('should generate a new content plan successfully', async () => {
      (mockCompanyProfileService.getProfileById as jest.Mock).mockResolvedValue(mockCompanyProfile);
      (mockContentPlanRepository.findPlanByNameAndOrganization as jest.Mock).mockResolvedValue(null);
      (mockContentPlanRepository.createPlan as jest.Mock).mockResolvedValue(mockContentPlan);

      const result = await service.generatePlan('org-1', generateDto);

      expect(mockCompanyProfileService.getProfileById).toHaveBeenCalledWith('profile-1', 'org-1');
      expect(mockContentPlanRepository.findPlanByNameAndOrganization).toHaveBeenCalledWith(
        'Test Plan',
        'org-1'
      );
      expect(mockContentPlanRepository.createPlan).toHaveBeenCalledWith(
        'org-1',
        'profile-1',
        generateDto,
        expect.any(Object), // weeklySchedule
        expect.any(Object)  // platformConfig
      );
      expect(result).toEqual(mockContentPlan);
    });

    it('should throw NotFoundException if company profile not found', async () => {
      (mockCompanyProfileService.getProfileById as jest.Mock).mockResolvedValue(null);

      await expect(service.generatePlan('org-1', generateDto)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw NotFoundException if company profile belongs to different organization', async () => {
      const differentOrgProfile = { ...mockCompanyProfile, organizationId: 'different-org' };
      (mockCompanyProfileService.getProfileById as jest.Mock).mockResolvedValue(differentOrgProfile);

      await expect(service.generatePlan('org-1', generateDto)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ConflictException if plan name already exists', async () => {
      (mockCompanyProfileService.getProfileById as jest.Mock).mockResolvedValue(mockCompanyProfile);
      (mockContentPlanRepository.findPlanByNameAndOrganization as jest.Mock).mockResolvedValue(mockContentPlan);

      await expect(service.generatePlan('org-1', generateDto)).rejects.toThrow(
        ConflictException
      );
    });

    it('should throw BadRequestException for unsupported platforms', async () => {
      const invalidDto: GenerateContentPlanDto = {
        ...generateDto,
        preferences: {
          ...generateDto.preferences,
          platforms: ['INVALID_PLATFORM' as any],
        },
      };

      (mockCompanyProfileService.getProfileById as jest.Mock).mockResolvedValue(mockCompanyProfile);

      await expect(service.generatePlan('org-1', invalidDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('customizePlan', () => {
    const customizeDto: CustomizeContentPlanDto = {
      modifications: [{
        postId: 'post-1',
        action: 'update',
        platform: Platform.INSTAGRAM,
        postType: PostType.FEED_POST,
      }],
    };

    it('should customize a content plan successfully', async () => {
      (mockContentPlanRepository.getPlanById as jest.Mock).mockResolvedValue(mockContentPlan);
      (mockContentPlanRepository.customizePlan as jest.Mock).mockResolvedValue(mockContentPlan);

      const result = await service.customizePlan('org-1', 'plan-1', customizeDto);

      expect(mockContentPlanRepository.getPlanById).toHaveBeenCalledWith('plan-1');
      expect(mockContentPlanRepository.customizePlan).toHaveBeenCalledWith(
        'plan-1',
        expect.any(Object)
      );
      expect(result).toEqual(mockContentPlan);
    });

    it('should throw BadRequestException if plan is active', async () => {
      const activePlan = { ...mockContentPlan, status: ContentPlanStatus.ACTIVE };
      (mockContentPlanRepository.getPlanById as jest.Mock).mockResolvedValue(activePlan);

      await expect(
        service.customizePlan('org-1', 'plan-1', customizeDto)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid time format', async () => {
      const invalidDto: CustomizeContentPlanDto = {
        modifications: [{
          postId: 'post-1',
          action: 'update',
          scheduledTime: '25:00', // Invalid time
        }],
      };

      (mockContentPlanRepository.getPlanById as jest.Mock).mockResolvedValue(mockContentPlan);

      await expect(
        service.customizePlan('org-1', 'plan-1', invalidDto)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('activatePlan', () => {
    it('should activate a content plan successfully', async () => {
      const activatedPlan = { ...mockContentPlan, status: ContentPlanStatus.ACTIVE };
      (mockContentPlanRepository.getPlanById as jest.Mock).mockResolvedValue(mockContentPlan);
      (mockContentPlanRepository.deactivateAllPlansForOrganization as jest.Mock).mockResolvedValue(undefined);
      (mockContentPlanRepository.activatePlan as jest.Mock).mockResolvedValue(activatedPlan);

      const result = await service.activatePlan('org-1', 'plan-1');

      expect(mockContentPlanRepository.getPlanById).toHaveBeenCalledWith('plan-1');
      expect(mockContentPlanRepository.deactivateAllPlansForOrganization).toHaveBeenCalledWith('org-1');
      expect(mockContentPlanRepository.activatePlan).toHaveBeenCalledWith('plan-1');
      expect(result).toEqual(activatedPlan);
    });

    it('should throw BadRequestException if plan is already active', async () => {
      const activePlan = { ...mockContentPlan, status: ContentPlanStatus.ACTIVE };
      (mockContentPlanRepository.getPlanById as jest.Mock).mockResolvedValue(activePlan);

      await expect(service.activatePlan('org-1', 'plan-1')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('deactivatePlan', () => {
    it('should deactivate a content plan successfully', async () => {
      const activePlan = { ...mockContentPlan, status: ContentPlanStatus.ACTIVE };
      const deactivatedPlan = { ...mockContentPlan, status: ContentPlanStatus.PAUSED };

      (mockContentPlanRepository.getPlanById as jest.Mock).mockResolvedValue(activePlan);
      (mockContentPlanRepository.deactivatePlan as jest.Mock).mockResolvedValue(deactivatedPlan);

      const result = await service.deactivatePlan('org-1', 'plan-1');

      expect(mockContentPlanRepository.getPlanById).toHaveBeenCalledWith('plan-1');
      expect(mockContentPlanRepository.deactivatePlan).toHaveBeenCalledWith('plan-1');
      expect(result).toEqual(deactivatedPlan);
    });

    it('should throw BadRequestException if plan is not active', async () => {
      (mockContentPlanRepository.getPlanById as jest.Mock).mockResolvedValue(mockContentPlan);

      await expect(service.deactivatePlan('org-1', 'plan-1')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('saveAsTemplate', () => {
    const templateData: SaveTemplateDto = {
      name: 'My Template',
      description: 'Test template',
    };

    it('should save plan as template successfully', async () => {
      const templatePlan = { ...mockContentPlan, isTemplate: true, name: 'My Template' };

      (mockContentPlanRepository.getPlanById as jest.Mock).mockResolvedValue(mockContentPlan);
      (mockContentPlanRepository.findPlanByNameAndOrganization as jest.Mock).mockResolvedValue(null);
      (mockContentPlanRepository.saveAsTemplate as jest.Mock).mockResolvedValue(templatePlan);

      const result = await service.saveAsTemplate('org-1', 'plan-1', templateData);

      expect(mockContentPlanRepository.getPlanById).toHaveBeenCalledWith('plan-1');
      expect(mockContentPlanRepository.findPlanByNameAndOrganization).toHaveBeenCalledWith(
        'My Template',
        'org-1'
      );
      expect(mockContentPlanRepository.saveAsTemplate).toHaveBeenCalledWith('plan-1', templateData);
      expect(result).toEqual(templatePlan);
    });

    it('should throw ConflictException if template name already exists', async () => {
      (mockContentPlanRepository.getPlanById as jest.Mock).mockResolvedValue(mockContentPlan);
      (mockContentPlanRepository.findPlanByNameAndOrganization as jest.Mock).mockResolvedValue(mockContentPlan);

      await expect(
        service.saveAsTemplate('org-1', 'plan-1', templateData)
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getPlanById', () => {
    it('should get plan by id successfully', async () => {
      (mockContentPlanRepository.getPlanById as jest.Mock).mockResolvedValue(mockContentPlan);

      const result = await service.getPlanById('org-1', 'plan-1');

      expect(mockContentPlanRepository.getPlanById).toHaveBeenCalledWith('plan-1');
      expect(result).toEqual(mockContentPlan);
    });

    it('should throw NotFoundException if plan not found', async () => {
      (mockContentPlanRepository.getPlanById as jest.Mock).mockResolvedValue(null);

      await expect(service.getPlanById('org-1', 'plan-1')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw NotFoundException if plan belongs to different organization', async () => {
      const differentOrgPlan = { ...mockContentPlan, organizationId: 'different-org' };
      (mockContentPlanRepository.getPlanById as jest.Mock).mockResolvedValue(differentOrgPlan);

      await expect(service.getPlanById('org-1', 'plan-1')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('deletePlan', () => {
    it('should delete plan successfully', async () => {
      (mockContentPlanRepository.getPlanById as jest.Mock).mockResolvedValue(mockContentPlan);
      (mockContentPlanRepository.deletePlan as jest.Mock).mockResolvedValue(mockContentPlan);

      await service.deletePlan('org-1', 'plan-1');

      expect(mockContentPlanRepository.getPlanById).toHaveBeenCalledWith('plan-1');
      expect(mockContentPlanRepository.deletePlan).toHaveBeenCalledWith('plan-1');
    });

    it('should throw BadRequestException if plan is active', async () => {
      const activePlan = { ...mockContentPlan, status: ContentPlanStatus.ACTIVE };
      (mockContentPlanRepository.getPlanById as jest.Mock).mockResolvedValue(activePlan);

      await expect(service.deletePlan('org-1', 'plan-1')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('duplicatePlan', () => {
    it('should duplicate plan successfully', async () => {
      const duplicatedPlan = { ...mockContentPlan, id: 'plan-2', name: 'Duplicated Plan' };

      (mockContentPlanRepository.getPlanById as jest.Mock).mockResolvedValue(mockContentPlan);
      (mockContentPlanRepository.findPlanByNameAndOrganization as jest.Mock).mockResolvedValue(null);
      (mockContentPlanRepository.duplicatePlan as jest.Mock).mockResolvedValue(duplicatedPlan);

      const result = await service.duplicatePlan('org-1', 'plan-1', 'Duplicated Plan');

      expect(mockContentPlanRepository.getPlanById).toHaveBeenCalledWith('plan-1');
      expect(mockContentPlanRepository.findPlanByNameAndOrganization).toHaveBeenCalledWith(
        'Duplicated Plan',
        'org-1'
      );
      expect(mockContentPlanRepository.duplicatePlan).toHaveBeenCalledWith('plan-1', 'Duplicated Plan');
      expect(result).toEqual(duplicatedPlan);
    });

    it('should throw ConflictException if new name already exists', async () => {
      (mockContentPlanRepository.getPlanById as jest.Mock).mockResolvedValue(mockContentPlan);
      (mockContentPlanRepository.findPlanByNameAndOrganization as jest.Mock).mockResolvedValue(mockContentPlan);

      await expect(
        service.duplicatePlan('org-1', 'plan-1', 'Existing Name')
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getActivePlan', () => {
    it('should get active plan successfully', async () => {
      const activePlan = { ...mockContentPlan, status: ContentPlanStatus.ACTIVE };
      (mockContentPlanRepository.getActivePlan as jest.Mock).mockResolvedValue(activePlan);

      const result = await service.getActivePlan('org-1');

      expect(mockContentPlanRepository.getActivePlan).toHaveBeenCalledWith('org-1');
      expect(result).toEqual(activePlan);
    });

    it('should return null if no active plan exists', async () => {
      (mockContentPlanRepository.getActivePlan as jest.Mock).mockResolvedValue(null);

      const result = await service.getActivePlan('org-1');

      expect(result).toBeNull();
    });
  });

  describe('getPlanHistory', () => {
    it('should get plan history successfully', async () => {
      const plans = [mockContentPlan];
      (mockContentPlanRepository.getPlansByOrganization as jest.Mock).mockResolvedValue(plans);

      const result = await service.getPlanHistory('org-1');

      expect(mockContentPlanRepository.getPlansByOrganization).toHaveBeenCalledWith('org-1');
      expect(result).toEqual(plans);
    });
  });

  describe('getTemplates', () => {
    it('should get templates successfully', async () => {
      const templates = [{ ...mockContentPlan, isTemplate: true }];
      (mockContentPlanRepository.getTemplatesByOrganization as jest.Mock).mockResolvedValue(templates);

      const result = await service.getTemplates('org-1');

      expect(mockContentPlanRepository.getTemplatesByOrganization).toHaveBeenCalledWith('org-1');
      expect(result).toEqual(templates);
    });
  });

  describe('getPlansByCompanyProfile', () => {
    it('should get plans by company profile successfully', async () => {
      const plans = [mockContentPlan];
      (mockCompanyProfileService.getProfileById as jest.Mock).mockResolvedValue(mockCompanyProfile);
      (mockContentPlanRepository.getPlansByCompanyProfile as jest.Mock).mockResolvedValue(plans);

      const result = await service.getPlansByCompanyProfile('org-1', 'profile-1');

      expect(mockCompanyProfileService.getProfileById).toHaveBeenCalledWith('profile-1', 'org-1');
      expect(mockContentPlanRepository.getPlansByCompanyProfile).toHaveBeenCalledWith('profile-1');
      expect(result).toEqual(plans);
    });

    it('should throw NotFoundException if company profile not found', async () => {
      (mockCompanyProfileService.getProfileById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getPlansByCompanyProfile('org-1', 'profile-1')
      ).rejects.toThrow(NotFoundException);
    });
  });
});