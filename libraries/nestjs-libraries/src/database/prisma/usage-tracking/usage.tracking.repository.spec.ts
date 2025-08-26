import { Test, TestingModule } from '@nestjs/testing';
import { UsageTrackingRepository } from './usage.tracking.repository';
import { PrismaRepository } from '../prisma.service';
import { UsageTracking } from '@prisma/client';

describe('UsageTrackingRepository', () => {
  let repository: UsageTrackingRepository;
  let mockPrismaRepository: jest.Mocked<PrismaRepository<'usageTracking'>>;

  const mockUsageRecord: UsageTracking = {
    id: 'usage-1',
    organizationId: 'org-1',
    month: 1,
    year: 2024,
    apiCalls: 50,
    monthlyLimit: 100,
    extraCredits: 10,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  };

  beforeEach(async () => {
    const mockModel = {
      usageTracking: {
        create: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn(),
        updateMany: jest.fn(),
        fields: {
          monthlyLimit: 'monthlyLimit',
        },
      },
    };

    mockPrismaRepository = {
      model: mockModel,
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsageTrackingRepository,
        {
          provide: PrismaRepository,
          useValue: mockPrismaRepository,
        },
      ],
    }).compile();

    repository = module.get<UsageTrackingRepository>(UsageTrackingRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUsageRecord', () => {
    it('should create a new usage record', async () => {
      const expectedData = {
        organizationId: 'org-1',
        month: 1,
        year: 2024,
        apiCalls: 0,
        monthlyLimit: 100,
        extraCredits: 0,
      };

      mockPrismaRepository.model.usageTracking.create.mockResolvedValue(mockUsageRecord);

      const result = await repository.createUsageRecord('org-1', 1, 2024, 100);

      expect(mockPrismaRepository.model.usageTracking.create).toHaveBeenCalledWith({
        data: expectedData,
      });
      expect(result).toEqual(mockUsageRecord);
    });
  });

  describe('getCurrentMonthUsage', () => {
    it('should return current month usage record', async () => {
      mockPrismaRepository.model.usageTracking.findUnique.mockResolvedValue(mockUsageRecord);

      const result = await repository.getCurrentMonthUsage('org-1', 1, 2024);

      expect(mockPrismaRepository.model.usageTracking.findUnique).toHaveBeenCalledWith({
        where: {
          organizationId_month_year: {
            organizationId: 'org-1',
            month: 1,
            year: 2024,
          },
        },
      });
      expect(result).toEqual(mockUsageRecord);
    });

    it('should return null if no record exists', async () => {
      mockPrismaRepository.model.usageTracking.findUnique.mockResolvedValue(null);

      const result = await repository.getCurrentMonthUsage('org-1', 1, 2024);

      expect(result).toBeNull();
    });
  });

  describe('incrementApiUsage', () => {
    it('should increment API usage for existing record', async () => {
      const updatedRecord = { ...mockUsageRecord, apiCalls: 55 };
      mockPrismaRepository.model.usageTracking.upsert.mockResolvedValue(updatedRecord);

      const result = await repository.incrementApiUsage('org-1', 1, 2024, 5);

      expect(mockPrismaRepository.model.usageTracking.upsert).toHaveBeenCalledWith({
        where: {
          organizationId_month_year: {
            organizationId: 'org-1',
            month: 1,
            year: 2024,
          },
        },
        update: {
          apiCalls: {
            increment: 5,
          },
          updatedAt: expect.any(Date),
        },
        create: {
          organizationId: 'org-1',
          month: 1,
          year: 2024,
          apiCalls: 5,
          monthlyLimit: 100,
          extraCredits: 0,
        },
      });
      expect(result).toEqual(updatedRecord);
    });

    it('should create new record if none exists', async () => {
      const newRecord = { ...mockUsageRecord, apiCalls: 5 };
      mockPrismaRepository.model.usageTracking.upsert.mockResolvedValue(newRecord);

      const result = await repository.incrementApiUsage('org-2', 1, 2024, 5);

      expect(mockPrismaRepository.model.usageTracking.upsert).toHaveBeenCalledWith({
        where: {
          organizationId_month_year: {
            organizationId: 'org-2',
            month: 1,
            year: 2024,
          },
        },
        update: {
          apiCalls: {
            increment: 5,
          },
          updatedAt: expect.any(Date),
        },
        create: {
          organizationId: 'org-2',
          month: 1,
          year: 2024,
          apiCalls: 5,
          monthlyLimit: 100,
          extraCredits: 0,
        },
      });
      expect(result).toEqual(newRecord);
    });
  });

  describe('updateMonthlyLimit', () => {
    it('should update monthly limit for existing record', async () => {
      const updatedRecord = { ...mockUsageRecord, monthlyLimit: 200 };
      mockPrismaRepository.model.usageTracking.upsert.mockResolvedValue(updatedRecord);

      const result = await repository.updateMonthlyLimit('org-1', 1, 2024, 200);

      expect(mockPrismaRepository.model.usageTracking.upsert).toHaveBeenCalledWith({
        where: {
          organizationId_month_year: {
            organizationId: 'org-1',
            month: 1,
            year: 2024,
          },
        },
        update: {
          monthlyLimit: 200,
          updatedAt: expect.any(Date),
        },
        create: {
          organizationId: 'org-1',
          month: 1,
          year: 2024,
          apiCalls: 0,
          monthlyLimit: 200,
          extraCredits: 0,
        },
      });
      expect(result).toEqual(updatedRecord);
    });
  });

  describe('addExtraCredits', () => {
    it('should add extra credits to existing record', async () => {
      const updatedRecord = { ...mockUsageRecord, extraCredits: 20 };
      mockPrismaRepository.model.usageTracking.upsert.mockResolvedValue(updatedRecord);

      const result = await repository.addExtraCredits('org-1', 1, 2024, 10);

      expect(mockPrismaRepository.model.usageTracking.upsert).toHaveBeenCalledWith({
        where: {
          organizationId_month_year: {
            organizationId: 'org-1',
            month: 1,
            year: 2024,
          },
        },
        update: {
          extraCredits: {
            increment: 10,
          },
          updatedAt: expect.any(Date),
        },
        create: {
          organizationId: 'org-1',
          month: 1,
          year: 2024,
          apiCalls: 0,
          monthlyLimit: 100,
          extraCredits: 10,
        },
      });
      expect(result).toEqual(updatedRecord);
    });
  });

  describe('resetMonthlyUsage', () => {
    it('should reset monthly usage and extra credits', async () => {
      const resetRecord = { ...mockUsageRecord, apiCalls: 0, extraCredits: 0 };
      mockPrismaRepository.model.usageTracking.upsert.mockResolvedValue(resetRecord);

      const result = await repository.resetMonthlyUsage('org-1', 1, 2024);

      expect(mockPrismaRepository.model.usageTracking.upsert).toHaveBeenCalledWith({
        where: {
          organizationId_month_year: {
            organizationId: 'org-1',
            month: 1,
            year: 2024,
          },
        },
        update: {
          apiCalls: 0,
          extraCredits: 0,
          updatedAt: expect.any(Date),
        },
        create: {
          organizationId: 'org-1',
          month: 1,
          year: 2024,
          apiCalls: 0,
          monthlyLimit: 100,
          extraCredits: 0,
        },
      });
      expect(result).toEqual(resetRecord);
    });
  });

  describe('getUsageHistory', () => {
    it('should return usage history for specified months', async () => {
      const historyRecords = [mockUsageRecord];
      mockPrismaRepository.model.usageTracking.findMany.mockResolvedValue(historyRecords);

      const result = await repository.getUsageHistory('org-1', 6);

      expect(mockPrismaRepository.model.usageTracking.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          OR: [
            {
              year: {
                gt: expect.any(Number),
              },
            },
            {
              year: expect.any(Number),
              month: {
                gte: expect.any(Number),
              },
            },
          ],
        },
        orderBy: [
          { year: 'desc' },
          { month: 'desc' },
        ],
      });
      expect(result).toEqual(historyRecords);
    });

    it('should use default 12 months if not specified', async () => {
      const historyRecords = [mockUsageRecord];
      mockPrismaRepository.model.usageTracking.findMany.mockResolvedValue(historyRecords);

      await repository.getUsageHistory('org-1');

      expect(mockPrismaRepository.model.usageTracking.findMany).toHaveBeenCalled();
    });
  });

  describe('getAllUsageForOrganization', () => {
    it('should return all usage records for organization', async () => {
      const allRecords = [mockUsageRecord];
      mockPrismaRepository.model.usageTracking.findMany.mockResolvedValue(allRecords);

      const result = await repository.getAllUsageForOrganization('org-1');

      expect(mockPrismaRepository.model.usageTracking.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
        },
        orderBy: [
          { year: 'desc' },
          { month: 'desc' },
        ],
      });
      expect(result).toEqual(allRecords);
    });
  });

  describe('deleteUsageRecord', () => {
    it('should delete usage record', async () => {
      mockPrismaRepository.model.usageTracking.delete.mockResolvedValue(mockUsageRecord);

      const result = await repository.deleteUsageRecord('org-1', 1, 2024);

      expect(mockPrismaRepository.model.usageTracking.delete).toHaveBeenCalledWith({
        where: {
          organizationId_month_year: {
            organizationId: 'org-1',
            month: 1,
            year: 2024,
          },
        },
      });
      expect(result).toEqual(mockUsageRecord);
    });
  });

  describe('getTotalUsageForOrganization', () => {
    it('should return total usage statistics', async () => {
      const aggregateResult = {
        _sum: {
          apiCalls: 150,
          extraCredits: 25,
        },
      };
      mockPrismaRepository.model.usageTracking.aggregate.mockResolvedValue(aggregateResult);

      const result = await repository.getTotalUsageForOrganization('org-1');

      expect(mockPrismaRepository.model.usageTracking.aggregate).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
        },
        _sum: {
          apiCalls: true,
          extraCredits: true,
        },
      });
      expect(result).toEqual({
        totalApiCalls: 150,
        totalExtraCredits: 25,
      });
    });

    it('should handle null aggregate results', async () => {
      const aggregateResult = {
        _sum: {
          apiCalls: null,
          extraCredits: null,
        },
      };
      mockPrismaRepository.model.usageTracking.aggregate.mockResolvedValue(aggregateResult);

      const result = await repository.getTotalUsageForOrganization('org-1');

      expect(result).toEqual({
        totalApiCalls: 0,
        totalExtraCredits: 0,
      });
    });
  });

  describe('getOrganizationsExceedingLimit', () => {
    it('should return organizations exceeding their limits', async () => {
      const exceedingRecords = [
        {
          organizationId: 'org-1',
          month: 1,
          year: 2024,
          apiCalls: 150,
          monthlyLimit: 100,
        },
      ];
      mockPrismaRepository.model.usageTracking.findMany.mockResolvedValue(exceedingRecords);

      const result = await repository.getOrganizationsExceedingLimit();

      expect(mockPrismaRepository.model.usageTracking.findMany).toHaveBeenCalledWith({
        where: {
          apiCalls: {
            gt: mockPrismaRepository.model.usageTracking.fields.monthlyLimit,
          },
        },
        select: {
          organizationId: true,
          month: true,
          year: true,
          apiCalls: true,
          monthlyLimit: true,
        },
      });
      expect(result).toEqual([
        {
          organizationId: 'org-1',
          month: 1,
          year: 2024,
          apiCalls: 150,
          limit: 100,
        },
      ]);
    });
  });

  describe('bulkResetMonthlyUsage', () => {
    it('should reset usage for multiple organizations', async () => {
      const updateResult = { count: 5 };
      mockPrismaRepository.model.usageTracking.updateMany.mockResolvedValue(updateResult);

      const organizationIds = ['org-1', 'org-2', 'org-3'];
      const result = await repository.bulkResetMonthlyUsage(organizationIds, 1, 2024);

      expect(mockPrismaRepository.model.usageTracking.updateMany).toHaveBeenCalledWith({
        where: {
          organizationId: {
            in: organizationIds,
          },
          month: 1,
          year: 2024,
        },
        data: {
          apiCalls: 0,
          extraCredits: 0,
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toBe(5);
    });
  });
});