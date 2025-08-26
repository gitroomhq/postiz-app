import { Test, TestingModule } from '@nestjs/testing';
import { CompanyProfileRepository } from './company.profile.repository';
import { PrismaRepository } from '../prisma.service';
import { CreateCompanyProfileDto, UpdateCompanyProfileDto } from '../../../dtos/content-automation/request.dtos';
import { MarketingGoalType } from '../../../dtos/content-automation/interfaces';

describe('CompanyProfileRepository', () => {
  let repository: CompanyProfileRepository;
  let mockPrismaRepository: jest.Mocked<PrismaRepository<'companyProfileAI'>>;

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
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaModel = {
      companyProfileAI: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    mockPrismaRepository = {
      model: mockPrismaModel,
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyProfileRepository,
        {
          provide: PrismaRepository,
          useValue: mockPrismaRepository,
        },
      ],
    }).compile();

    repository = module.get<CompanyProfileRepository>(CompanyProfileRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createProfile', () => {
    it('should create a company profile successfully', async () => {
      const createDto: CreateCompanyProfileDto = {
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

      (mockPrismaRepository.model.companyProfileAI.create as jest.Mock).mockResolvedValue(mockCompanyProfile);

      const result = await repository.createProfile('org-id', createDto);

      expect(mockPrismaRepository.model.companyProfileAI.create).toHaveBeenCalledWith({
        data: {
          name: createDto.name,
          industry: createDto.industry,
          description: createDto.description,
          products: createDto.products,
          targetAudience: createDto.targetAudience,
          competitors: createDto.competitors,
          usp: createDto.usp,
          brandVoice: createDto.brandVoice,
          marketingGoals: createDto.marketingGoals,
          organizationId: 'org-id',
          isTemplate: false,
        },
      });
      expect(result).toEqual(mockCompanyProfile);
    });

    it('should create a template profile when isTemplate is true', async () => {
      const createDto: CreateCompanyProfileDto = {
        name: 'Template Company',
        industry: 'Technology',
        products: [],
        targetAudience: 'Tech professionals',
        competitors: [],
        usp: 'Best in class solution',
        brandVoice: 'Professional and friendly',
        marketingGoals: [],
        isTemplate: true,
      };

      (mockPrismaRepository.model.companyProfileAI.create as jest.Mock).mockResolvedValue({
        ...mockCompanyProfile,
        isTemplate: true,
      });

      await repository.createProfile('org-id', createDto);

      expect(mockPrismaRepository.model.companyProfileAI.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isTemplate: true,
        }),
      });
    });
  });

  describe('updateProfile', () => {
    it('should update a company profile successfully', async () => {
      const updateDto: UpdateCompanyProfileDto = {
        name: 'Updated Company',
        description: 'Updated description',
      };

      const updatedProfile = { ...mockCompanyProfile, ...updateDto };
      (mockPrismaRepository.model.companyProfileAI.update as jest.Mock).mockResolvedValue(updatedProfile);

      const result = await repository.updateProfile('test-id', updateDto);

      expect(mockPrismaRepository.model.companyProfileAI.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: {
          name: updateDto.name,
          description: updateDto.description,
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(updatedProfile);
    });

    it('should only update provided fields', async () => {
      const updateDto: UpdateCompanyProfileDto = {
        name: 'Updated Company',
      };

      (mockPrismaRepository.model.companyProfileAI.update as jest.Mock).mockResolvedValue(mockCompanyProfile);

      await repository.updateProfile('test-id', updateDto);

      expect(mockPrismaRepository.model.companyProfileAI.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: {
          name: updateDto.name,
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe('getProfileById', () => {
    it('should return a profile by id', async () => {
      (mockPrismaRepository.model.companyProfileAI.findUnique as jest.Mock).mockResolvedValue(mockCompanyProfile);

      const result = await repository.getProfileById('test-id');

      expect(mockPrismaRepository.model.companyProfileAI.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      });
      expect(result).toEqual(mockCompanyProfile);
    });

    it('should return null if profile not found', async () => {
      (mockPrismaRepository.model.companyProfileAI.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.getProfileById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('getProfilesByOrganization', () => {
    it('should return profiles for an organization excluding templates', async () => {
      const profiles = [mockCompanyProfile];
      (mockPrismaRepository.model.companyProfileAI.findMany as jest.Mock).mockResolvedValue(profiles);

      const result = await repository.getProfilesByOrganization('org-id');

      expect(mockPrismaRepository.model.companyProfileAI.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-id',
          isTemplate: false,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });
      expect(result).toEqual(profiles);
    });
  });

  describe('getTemplatesByOrganization', () => {
    it('should return templates for an organization', async () => {
      const templates = [{ ...mockCompanyProfile, isTemplate: true }];
      (mockPrismaRepository.model.companyProfileAI.findMany as jest.Mock).mockResolvedValue(templates);

      const result = await repository.getTemplatesByOrganization('org-id');

      expect(mockPrismaRepository.model.companyProfileAI.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-id',
          isTemplate: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });
      expect(result).toEqual(templates);
    });
  });

  describe('deleteProfile', () => {
    it('should delete a profile successfully', async () => {
      (mockPrismaRepository.model.companyProfileAI.delete as jest.Mock).mockResolvedValue(mockCompanyProfile);

      const result = await repository.deleteProfile('test-id');

      expect(mockPrismaRepository.model.companyProfileAI.delete).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      });
      expect(result).toEqual(mockCompanyProfile);
    });
  });

  describe('saveAsTemplate', () => {
    it('should save a profile as template', async () => {
      const templateProfile = { ...mockCompanyProfile, isTemplate: true };
      (mockPrismaRepository.model.companyProfileAI.update as jest.Mock).mockResolvedValue(templateProfile);

      const result = await repository.saveAsTemplate('test-id');

      expect(mockPrismaRepository.model.companyProfileAI.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: {
          isTemplate: true,
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(templateProfile);
    });
  });

  describe('countProfilesByOrganization', () => {
    it('should return count of profiles for an organization', async () => {
      (mockPrismaRepository.model.companyProfileAI.count as jest.Mock).mockResolvedValue(5);

      const result = await repository.countProfilesByOrganization('org-id');

      expect(mockPrismaRepository.model.companyProfileAI.count).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-id',
          isTemplate: false,
        },
      });
      expect(result).toBe(5);
    });
  });

  describe('findProfileByNameAndOrganization', () => {
    it('should find a profile by name and organization', async () => {
      (mockPrismaRepository.model.companyProfileAI.findFirst as jest.Mock).mockResolvedValue(mockCompanyProfile);

      const result = await repository.findProfileByNameAndOrganization('Test Company', 'org-id');

      expect(mockPrismaRepository.model.companyProfileAI.findFirst).toHaveBeenCalledWith({
        where: {
          name: 'Test Company',
          organizationId: 'org-id',
        },
      });
      expect(result).toEqual(mockCompanyProfile);
    });
  });

  describe('duplicateProfile', () => {
    it('should duplicate a profile with new name', async () => {
      const newProfile = { ...mockCompanyProfile, name: 'Duplicated Company' };

      (mockPrismaRepository.model.companyProfileAI.findUnique as jest.Mock).mockResolvedValue(mockCompanyProfile);
      (mockPrismaRepository.model.companyProfileAI.create as jest.Mock).mockResolvedValue(newProfile);

      const result = await repository.duplicateProfile('test-id', 'Duplicated Company');

      expect(mockPrismaRepository.model.companyProfileAI.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      });
      expect(mockPrismaRepository.model.companyProfileAI.create).toHaveBeenCalledWith({
        data: {
          name: 'Duplicated Company',
          industry: mockCompanyProfile.industry,
          description: mockCompanyProfile.description,
          products: mockCompanyProfile.products,
          targetAudience: mockCompanyProfile.targetAudience,
          competitors: mockCompanyProfile.competitors,
          usp: mockCompanyProfile.usp,
          brandVoice: mockCompanyProfile.brandVoice,
          marketingGoals: mockCompanyProfile.marketingGoals,
          organizationId: mockCompanyProfile.organizationId,
          isTemplate: false,
        },
      });
      expect(result).toEqual(newProfile);
    });

    it('should throw error if original profile not found', async () => {
      (mockPrismaRepository.model.companyProfileAI.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(repository.duplicateProfile('non-existent-id', 'New Name')).rejects.toThrow('Profile not found');
    });
  });
});