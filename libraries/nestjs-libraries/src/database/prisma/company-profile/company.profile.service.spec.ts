import { Test, TestingModule } from '@nestjs/testing';
import { CompanyProfileService } from './company.profile.service';
import { CompanyProfileRepository } from './company.profile.repository';
import { ContentPlanRepository } from '../content-plan/content.plan.repository';
import { CreateCompanyProfileDto, UpdateCompanyProfileDto } from '../../../dtos/content-automation/request.dtos';
import { MarketingGoalType } from '../../../dtos/content-automation/interfaces';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

describe('CompanyProfileService', () => {
  let service: CompanyProfileService;
  let mockRepository: jest.Mocked<CompanyProfileRepository>;
  let mockContentPlanRepository: jest.Mocked<ContentPlanRepository>;

  const mockCompanyProfile = {
    id: 'test-id',
    name: 'Test Company',
    industry: 'Technology',
    description: 'A test company',
    products: [
      {
        name: 'Test Product',
        description: 'A test product',
        category: 'Software',
        keyFeatures: ['Feature 1', 'Feature 2'],
      },
    ],
    targetAudience: 'Tech professionals',
    competitors: [
      {
        name: 'Competitor 1',
        website: 'https://competitor1.com',
        strengths: ['Strong brand'],
        weaknesses: ['High price'],
        differentiators: ['Better support'],
      },
    ],
    usp: 'Best in class solution',
    brandVoice: 'Professional and friendly',
    marketingGoals: [
      {
        type: MarketingGoalType.BRAND_AWARENESS,
        description: 'Increase brand awareness',
        priority: 'high' as const,
        metrics: ['Reach', 'Impressions'],
      },
    ],
    organizationId: 'org-id',
    isTemplate: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const mockRepositoryMethods = {
      createProfile: jest.fn(),
      updateProfile: jest.fn(),
      getProfileById: jest.fn(),
      getProfilesByOrganization: jest.fn(),
      getTemplatesByOrganization: jest.fn(),
      getAllProfilesByOrganization: jest.fn(),
      deleteProfile: jest.fn(),
      saveAsTemplate: jest.fn(),
      countProfilesByOrganization: jest.fn(),
      findProfileByNameAndOrganization: jest.fn(),
      duplicateProfile: jest.fn(),
    };

    const mockContentPlanRepositoryMethods = {
      getPlansByCompanyProfile: jest.fn(),
      getPlanById: jest.fn(),
      getPlansByOrganization: jest.fn(),
      getTemplatesByOrganization: jest.fn(),
      getActivePlan: jest.fn(),
      activatePlan: jest.fn(),
      deactivatePlan: jest.fn(),
      deletePlan: jest.fn(),
      createPlan: jest.fn(),
      updatePlan: jest.fn(),
      customizePlan: jest.fn(),
      saveAsTemplate: jest.fn(),
      duplicatePlan: jest.fn(),
      updatePlanStatus: jest.fn(),
      countPlansByOrganization: jest.fn(),
      countTemplatesByOrganization: jest.fn(),
      findPlanByNameAndOrganization: jest.fn(),
      getPlansByStatus: jest.fn(),
      deactivateAllPlansForOrganization: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyProfileService,
        {
          provide: CompanyProfileRepository,
          useValue: mockRepositoryMethods,
        },
        {
          provide: ContentPlanRepository,
          useValue: mockContentPlanRepositoryMethods,
        },
      ],
    }).compile();

    service = module.get<CompanyProfileService>(CompanyProfileService);
    mockRepository = module.get(CompanyProfileRepository);
    mockContentPlanRepository = module.get(ContentPlanRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createProfile', () => {
    const validCreateDto: CreateCompanyProfileDto = {
      name: 'Test Company',
      industry: 'Technology',
      description: 'A test company',
      products: [
        {
          name: 'Test Product',
          description: 'A test product',
          category: 'Software',
          keyFeatures: ['Feature 1', 'Feature 2'],
        },
      ],
      targetAudience: 'Tech professionals',
      competitors: [
        {
          name: 'Competitor 1',
          website: 'https://competitor1.com',
          strengths: ['Strong brand'],
          weaknesses: ['High price'],
          differentiators: ['Better support'],
        },
      ],
      usp: 'Best in class solution',
      brandVoice: 'Professional and friendly',
      marketingGoals: [
        {
          type: MarketingGoalType.BRAND_AWARENESS,
          description: 'Increase brand awareness',
          priority: 'high',
          metrics: ['Reach', 'Impressions'],
        },
      ],
    };

    it('should create a profile successfully', async () => {
      (mockRepository.countProfilesByOrganization as jest.Mock).mockResolvedValue(5);
      (mockRepository.findProfileByNameAndOrganization as jest.Mock).mockResolvedValue(null);
      (mockRepository.createProfile as jest.Mock).mockResolvedValue(mockCompanyProfile);

      const result = await service.createProfile('org-id', validCreateDto);

      expect(mockRepository.countProfilesByOrganization).toHaveBeenCalledWith('org-id');
      expect(mockRepository.findProfileByNameAndOrganization).toHaveBeenCalledWith('Test Company', 'org-id');
      expect(mockRepository.createProfile).toHaveBeenCalledWith('org-id', validCreateDto);
      expect(result.id).toBe('test-id');
      expect(result.name).toBe('Test Company');
    });

    it('should throw BadRequestException when profile limit is reached', async () => {
      (mockRepository.countProfilesByOrganization as jest.Mock).mockResolvedValue(10);

      await expect(service.createProfile('org-id', validCreateDto)).rejects.toThrow(BadRequestException);
      expect(mockRepository.createProfile).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when profile name already exists', async () => {
      (mockRepository.countProfilesByOrganization as jest.Mock).mockResolvedValue(5);
      (mockRepository.findProfileByNameAndOrganization as jest.Mock).mockResolvedValue(mockCompanyProfile);

      await expect(service.createProfile('org-id', validCreateDto)).rejects.toThrow(ConflictException);
      expect(mockRepository.createProfile).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid data', async () => {
      const invalidDto = { ...validCreateDto, name: '' };
      (mockRepository.countProfilesByOrganization as jest.Mock).mockResolvedValue(5);
      (mockRepository.findProfileByNameAndOrganization as jest.Mock).mockResolvedValue(null);

      await expect(service.createProfile('org-id', invalidDto)).rejects.toThrow(BadRequestException);
      expect(mockRepository.createProfile).not.toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    const updateDto: UpdateCompanyProfileDto = {
      name: 'Updated Company',
      description: 'Updated description',
    };

    it('should update a profile successfully', async () => {
      const updatedProfile = { ...mockCompanyProfile, ...updateDto };
      (mockRepository.getProfileById as jest.Mock).mockResolvedValue(mockCompanyProfile);
      (mockRepository.findProfileByNameAndOrganization as jest.Mock).mockResolvedValue(null);
      (mockRepository.updateProfile as jest.Mock).mockResolvedValue(updatedProfile);

      const result = await service.updateProfile('test-id', 'org-id', updateDto);

      expect(mockRepository.getProfileById).toHaveBeenCalledWith('test-id');
      expect(mockRepository.updateProfile).toHaveBeenCalledWith('test-id', updateDto);
      expect(result.name).toBe('Updated Company');
    });

    it('should throw NotFoundException when profile does not exist', async () => {
      (mockRepository.getProfileById as jest.Mock).mockResolvedValue(null);

      await expect(service.updateProfile('non-existent-id', 'org-id', updateDto)).rejects.toThrow(NotFoundException);
      expect(mockRepository.updateProfile).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when profile belongs to different organization', async () => {
      const differentOrgProfile = { ...mockCompanyProfile, organizationId: 'different-org' };
      (mockRepository.getProfileById as jest.Mock).mockResolvedValue(differentOrgProfile);

      await expect(service.updateProfile('test-id', 'org-id', updateDto)).rejects.toThrow(NotFoundException);
      expect(mockRepository.updateProfile).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when updating to existing name', async () => {
      const conflictingProfile = { ...mockCompanyProfile, id: 'different-id' };
      (mockRepository.getProfileById as jest.Mock).mockResolvedValue(mockCompanyProfile);
      (mockRepository.findProfileByNameAndOrganization as jest.Mock).mockResolvedValue(conflictingProfile);

      await expect(service.updateProfile('test-id', 'org-id', updateDto)).rejects.toThrow(ConflictException);
      expect(mockRepository.updateProfile).not.toHaveBeenCalled();
    });
  });

  describe('getProfileById', () => {
    it('should return a profile by id', async () => {
      (mockRepository.getProfileById as jest.Mock).mockResolvedValue(mockCompanyProfile);

      const result = await service.getProfileById('test-id', 'org-id');

      expect(mockRepository.getProfileById).toHaveBeenCalledWith('test-id');
      expect(result.id).toBe('test-id');
    });

    it('should throw NotFoundException when profile does not exist', async () => {
      (mockRepository.getProfileById as jest.Mock).mockResolvedValue(null);

      await expect(service.getProfileById('non-existent-id', 'org-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when profile belongs to different organization', async () => {
      const differentOrgProfile = { ...mockCompanyProfile, organizationId: 'different-org' };
      (mockRepository.getProfileById as jest.Mock).mockResolvedValue(differentOrgProfile);

      await expect(service.getProfileById('test-id', 'org-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProfiles', () => {
    it('should return profiles and templates for organization', async () => {
      const profiles = [mockCompanyProfile];
      const templates = [{ ...mockCompanyProfile, isTemplate: true }];

      (mockRepository.getProfilesByOrganization as jest.Mock).mockResolvedValue(profiles);
      (mockRepository.getTemplatesByOrganization as jest.Mock).mockResolvedValue(templates);

      const result = await service.getProfiles('org-id');

      expect(mockRepository.getProfilesByOrganization).toHaveBeenCalledWith('org-id');
      expect(mockRepository.getTemplatesByOrganization).toHaveBeenCalledWith('org-id');
      expect(result.profiles).toHaveLength(1);
      expect(result.templates).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('deleteProfile', () => {
    it('should delete a profile successfully when no content plans exist', async () => {
      (mockRepository.getProfileById as jest.Mock).mockResolvedValue(mockCompanyProfile);
      (mockContentPlanRepository.getPlansByCompanyProfile as jest.Mock).mockResolvedValue([]);
      (mockRepository.deleteProfile as jest.Mock).mockResolvedValue(mockCompanyProfile);

      await service.deleteProfile('test-id', 'org-id');

      expect(mockRepository.getProfileById).toHaveBeenCalledWith('test-id');
      expect(mockContentPlanRepository.getPlansByCompanyProfile).toHaveBeenCalledWith('test-id');
      expect(mockRepository.deleteProfile).toHaveBeenCalledWith('test-id');
    });

    it('should throw NotFoundException when profile does not exist', async () => {
      (mockRepository.getProfileById as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteProfile('non-existent-id', 'org-id')).rejects.toThrow(NotFoundException);
      expect(mockRepository.deleteProfile).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when profile is used by active content plans', async () => {
      const activePlan = { id: 'plan-1', status: 'ACTIVE', companyProfileId: 'test-id' };
      (mockRepository.getProfileById as jest.Mock).mockResolvedValue(mockCompanyProfile);
      (mockContentPlanRepository.getPlansByCompanyProfile as jest.Mock).mockResolvedValue([activePlan] as any);

      await expect(service.deleteProfile('test-id', 'org-id')).rejects.toThrow(BadRequestException);
      expect(mockRepository.deleteProfile).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when profile is used by any content plans', async () => {
      const inactivePlan = { id: 'plan-1', status: 'DRAFT', companyProfileId: 'test-id' };
      (mockRepository.getProfileById as jest.Mock).mockResolvedValue(mockCompanyProfile);
      (mockContentPlanRepository.getPlansByCompanyProfile as jest.Mock).mockResolvedValue([inactivePlan] as any);

      await expect(service.deleteProfile('test-id', 'org-id')).rejects.toThrow(BadRequestException);
      expect(mockRepository.deleteProfile).not.toHaveBeenCalled();
    });
  });

  describe('saveAsTemplate', () => {
    it('should save profile as template successfully', async () => {
      const templateProfile = { ...mockCompanyProfile, isTemplate: true };
      (mockRepository.getProfileById as jest.Mock).mockResolvedValue(mockCompanyProfile);
      (mockRepository.saveAsTemplate as jest.Mock).mockResolvedValue(templateProfile);

      const result = await service.saveAsTemplate('test-id', 'org-id');

      expect(mockRepository.getProfileById).toHaveBeenCalledWith('test-id');
      expect(mockRepository.saveAsTemplate).toHaveBeenCalledWith('test-id');
      expect(result.isTemplate).toBe(true);
    });

    it('should throw NotFoundException when profile does not exist', async () => {
      (mockRepository.getProfileById as jest.Mock).mockResolvedValue(null);

      await expect(service.saveAsTemplate('non-existent-id', 'org-id')).rejects.toThrow(NotFoundException);
      expect(mockRepository.saveAsTemplate).not.toHaveBeenCalled();
    });
  });

  describe('duplicateProfile', () => {
    it('should duplicate a profile successfully', async () => {
      const duplicatedProfile = { ...mockCompanyProfile, name: 'Duplicated Company' };
      (mockRepository.getProfileById as jest.Mock).mockResolvedValue(mockCompanyProfile);
      (mockRepository.countProfilesByOrganization as jest.Mock).mockResolvedValue(5);
      (mockRepository.findProfileByNameAndOrganization as jest.Mock).mockResolvedValue(null);
      (mockRepository.duplicateProfile as jest.Mock).mockResolvedValue(duplicatedProfile);

      const result = await service.duplicateProfile('test-id', 'org-id', 'Duplicated Company');

      expect(mockRepository.getProfileById).toHaveBeenCalledWith('test-id');
      expect(mockRepository.countProfilesByOrganization).toHaveBeenCalledWith('org-id');
      expect(mockRepository.findProfileByNameAndOrganization).toHaveBeenCalledWith('Duplicated Company', 'org-id');
      expect(mockRepository.duplicateProfile).toHaveBeenCalledWith('test-id', 'Duplicated Company');
      expect(result.name).toBe('Duplicated Company');
    });

    it('should throw BadRequestException when profile limit is reached', async () => {
      (mockRepository.getProfileById as jest.Mock).mockResolvedValue(mockCompanyProfile);
      (mockRepository.countProfilesByOrganization as jest.Mock).mockResolvedValue(10);

      await expect(service.duplicateProfile('test-id', 'org-id', 'New Name')).rejects.toThrow(BadRequestException);
      expect(mockRepository.duplicateProfile).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when new name already exists', async () => {
      (mockRepository.getProfileById as jest.Mock).mockResolvedValue(mockCompanyProfile);
      (mockRepository.countProfilesByOrganization as jest.Mock).mockResolvedValue(5);
      (mockRepository.findProfileByNameAndOrganization as jest.Mock).mockResolvedValue(mockCompanyProfile);

      await expect(service.duplicateProfile('test-id', 'org-id', 'Existing Name')).rejects.toThrow(ConflictException);
      expect(mockRepository.duplicateProfile).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should validate required fields', async () => {
      const invalidDto = {
        name: '',
        industry: 'Technology',
        products: [],
        targetAudience: 'Tech professionals',
        competitors: [],
        usp: 'Best in class solution',
        brandVoice: 'Professional and friendly',
        marketingGoals: [],
      };

      (mockRepository.countProfilesByOrganization as jest.Mock).mockResolvedValue(5);
      (mockRepository.findProfileByNameAndOrganization as jest.Mock).mockResolvedValue(null);

      await expect(service.createProfile('org-id', invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should validate empty arrays', async () => {
      const invalidDto = {
        name: 'Test Company',
        industry: 'Technology',
        products: [],
        targetAudience: 'Tech professionals',
        competitors: [],
        usp: 'Best in class solution',
        brandVoice: 'Professional and friendly',
        marketingGoals: [],
      };

      (mockRepository.countProfilesByOrganization as jest.Mock).mockResolvedValue(5);
      (mockRepository.findProfileByNameAndOrganization as jest.Mock).mockResolvedValue(null);

      await expect(service.createProfile('org-id', invalidDto)).rejects.toThrow(BadRequestException);
    });
  });
});