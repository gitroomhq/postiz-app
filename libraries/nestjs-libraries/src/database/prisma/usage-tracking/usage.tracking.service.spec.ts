import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UsageTrackingService } from './usage.tracking.service';
import { UsageTrackingRepository } from './usage.tracking.repository';
import { UsageTracking } from '@prisma/client';

describe('UsageTrackingService', () => {
  let service: UsageTrackingService;
  let mockRepository: jest.Mocked<UsageTrackingRepository>;

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
    const mockRepositoryMethods = {
      createUsageRecord: jest.fn(),
      getCurrentMonthUsage: jest.fn(),
      incrementApiUsage: jest.fn(),
      updateMonthlyLimit: jest.fn(),
      addExtraCredits: jest.fn(),
      resetMonthlyUsage: jest.fn(),
      getUsageHistory: jest.fn(),
      getAllUsageForOrganization: jest.fn(),
      deleteUsageRecord: jest.fn(),
      getTotalUsageForOrganization: jest.fn(),
      getOrganizationsExceedingLimit: jest.fn(),
      bulkResetMonthlyUsage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsageTrackingService,
        {
          provide: UsageTrackingRepository,
          useValue: mockRepositoryMethods,
        },
      ],
    }).compile();

    service = module.get<UsageTrackingService>(UsageTrackingService);
    mockRepository = module.get(UsageTrackingRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('trackAPIUsage', () => {
    beforeEach(() => {
      // Mock current date to January 15, 2024
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should track API usage successfully when within limits', async () => {
      mockRepository.getCurrentMonthUsage.mockResolvedValue(mockUsageRecord);
      mockRepository.incrementApiUsage.mockResolvedValue(mockUsageRecord);

      await service.trackAPIUsage('org-1', { calls: 5 });

      expect(mockRepository.incrementApiUsage).toHaveBeenCalledWith('org-1', 1, 2024, 5);
    });

    it('should throw ForbiddenException when usage would exceed limits', async () => {
      const nearLimitRecord = { ...mockUsageRecord, apiCalls: 105 }; // Already over limit
      mockRepository.getCurrentMonthUsage.mockResolvedValue(nearLimitRecord);

      await expect(service.trackAPIUsage('org-1', { calls: 10 }))
        .rejects.toThrow(ForbiddenException);

      expect(mockRepository.incrementApiUsage).not.toHaveBeenCalled();
    });

    it('should create initial record if none exists', async () => {
      mockRepository.getCurrentMonthUsage.mockResolvedValue(null);
      mockRepository.createUsageRecord.mockResolvedValue(mockUsageRecord);
      mockRepository.incrementApiUsage.mockResolvedValue(mockUsageRecord);

      await service.trackAPIUsage('org-1', { calls: 5 });

      expect(mockRepository.createUsageRecord).toHaveBeenCalledWith('org-1', 1, 2024, 100);
      expect(mockRepository.incrementApiUsage).toHaveBeenCalledWith('org-1', 1, 2024, 5);
    });
  });

  describe('checkUsageLimit', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return usage limit result for existing record', async () => {
      mockRepository.getCurrentMonthUsage.mockResolvedValue(mockUsageRecord);

      const result = await service.checkUsageLimit('org-1');

      expect(result).toEqual({
        canProceed: true,
        remainingCalls: 60, // 100 + 10 - 50
        monthlyLimit: 100,
        extraCredits: 10,
        usagePercentage: 45.45, // 50 / (100 + 10) * 100
        resetDate: new Date(2024, 1, 1), // February 1, 2024
        warningLevel: 'none',
        message: 'You have 60 API calls remaining this month.',
      });
    });

    it('should create initial record if none exists', async () => {
      mockRepository.getCurrentMonthUsage.mockResolvedValue(null);
      mockRepository.createUsageRecord.mockResolvedValue({
        ...mockUsageRecord,
        apiCalls: 0,
        extraCredits: 0,
      });

      const result = await service.checkUsageLimit('org-1');

      expect(mockRepository.createUsageRecord).toHaveBeenCalledWith('org-1', 1, 2024, 100);
      expect(result.canProceed).toBe(true);
      expect(result.remainingCalls).toBe(100);
    });

    it('should return correct warning levels', async () => {
      // Test critical warning (95%+ usage)
      const criticalRecord = { ...mockUsageRecord, apiCalls: 105 }; // 105 / 110 = 95.45%
      mockRepository.getCurrentMonthUsage.mockResolvedValue(criticalRecord);

      const result = await service.checkUsageLimit('org-1');

      expect(result.warningLevel).toBe('critical');
      expect(result.canProceed).toBe(true);
      expect(result.remainingCalls).toBe(5);
    });

    it('should handle exceeded limits', async () => {
      const exceededRecord = { ...mockUsageRecord, apiCalls: 120 }; // Over limit
      mockRepository.getCurrentMonthUsage.mockResolvedValue(exceededRecord);

      const result = await service.checkUsageLimit('org-1');

      expect(result.canProceed).toBe(false);
      expect(result.remainingCalls).toBe(0);
      expect(result.message).toContain('Monthly API limit exceeded');
    });
  });

  describe('resetMonthlyUsage', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should reset monthly usage', async () => {
      mockRepository.resetMonthlyUsage.mockResolvedValue(mockUsageRecord);

      await service.resetMonthlyUsage('org-1');

      expect(mockRepository.resetMonthlyUsage).toHaveBeenCalledWith('org-1', 1, 2024);
    });
  });

  describe('purchaseExtraCredits', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should purchase extra credits successfully', async () => {
      mockRepository.addExtraCredits.mockResolvedValue(mockUsageRecord);
      mockRepository.getCurrentMonthUsage.mockResolvedValue(mockUsageRecord);

      const result = await service.purchaseExtraCredits('org-1', { credits: 50 });

      expect(mockRepository.addExtraCredits).toHaveBeenCalledWith('org-1', 1, 2024, 50);
      expect(result).toBeDefined();
      expect(result.organizationId).toBe('org-1');
    });

    it('should throw BadRequestException for invalid credits', async () => {
      await expect(service.purchaseExtraCredits('org-1', { credits: 0 }))
        .rejects.toThrow(BadRequestException);

      await expect(service.purchaseExtraCredits('org-1', { credits: -10 }))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('updateMonthlyLimit', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should update monthly limit successfully', async () => {
      mockRepository.updateMonthlyLimit.mockResolvedValue(mockUsageRecord);
      mockRepository.getCurrentMonthUsage.mockResolvedValue(mockUsageRecord);

      const result = await service.updateMonthlyLimit('org-1', { monthlyLimit: 200 });

      expect(mockRepository.updateMonthlyLimit).toHaveBeenCalledWith('org-1', 1, 2024, 200);
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException for negative limit', async () => {
      await expect(service.updateMonthlyLimit('org-1', { monthlyLimit: -10 }))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('getUsageStats', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return usage stats with history', async () => {
      const historyRecords = [
        { ...mockUsageRecord, month: 12, year: 2023, apiCalls: 80 },
        { ...mockUsageRecord, month: 11, year: 2023, apiCalls: 90 },
      ];

      mockRepository.getCurrentMonthUsage.mockResolvedValue(mockUsageRecord);
      mockRepository.getUsageHistory.mockResolvedValue(historyRecords);

      const result = await service.getUsageStats('org-1', { includeHistory: true });

      expect(result.organizationId).toBe('org-1');
      expect(result.currentMonth.apiCalls).toBe(50);
      expect(result.currentMonth.remainingCalls).toBe(60);
      expect(result.currentMonth.usagePercentage).toBe(45.45);
      expect(result.history).toHaveLength(2);
    });

    it('should return usage stats without history when includeHistory is false', async () => {
      mockRepository.getCurrentMonthUsage.mockResolvedValue(mockUsageRecord);

      const result = await service.getUsageStats('org-1', { includeHistory: false });

      expect(result.history).toHaveLength(0);
      expect(mockRepository.getUsageHistory).not.toHaveBeenCalled();
    });

    it('should include projections when requested', async () => {
      mockRepository.getCurrentMonthUsage.mockResolvedValue(mockUsageRecord);
      mockRepository.getUsageHistory.mockResolvedValue([]);

      const result = await service.getUsageStats('org-1', { includeProjections: true });

      expect(result.projectedUsage).toBeDefined();
      expect(result.projectedUsage?.estimatedMonthlyUsage).toBeGreaterThan(0);
    });

    it('should create initial record if none exists', async () => {
      mockRepository.getCurrentMonthUsage.mockResolvedValue(null);
      mockRepository.createUsageRecord.mockResolvedValue({
        ...mockUsageRecord,
        apiCalls: 0,
        extraCredits: 0,
      });
      mockRepository.getUsageHistory.mockResolvedValue([]);

      const result = await service.getUsageStats('org-1');

      expect(mockRepository.createUsageRecord).toHaveBeenCalled();
      expect(result.currentMonth.apiCalls).toBe(0);
    });
  });

  describe('getUsageLimitResult', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return usage limit result with upgrade options', async () => {
      mockRepository.getCurrentMonthUsage.mockResolvedValue(mockUsageRecord);

      const result = await service.getUsageLimitResult('org-1');

      expect(result.canProceed).toBe(true);
      expect(result.remainingCalls).toBe(60);
      expect(result.upgradeOptions).toBeDefined();
      expect(result.upgradeOptions?.length).toBeGreaterThan(0);
    });
  });

  describe('bulkResetMonthlyUsage', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should reset usage for multiple organizations', async () => {
      mockRepository.bulkResetMonthlyUsage.mockResolvedValue(3);

      const organizationIds = ['org-1', 'org-2', 'org-3'];
      const result = await service.bulkResetMonthlyUsage(organizationIds);

      expect(mockRepository.bulkResetMonthlyUsage).toHaveBeenCalledWith(organizationIds, 1, 2024);
      expect(result).toBe(3);
    });
  });

  describe('getOrganizationsExceedingLimit', () => {
    it('should return organizations exceeding limits', async () => {
      const exceedingOrgs = [
        { organizationId: 'org-1', month: 1, year: 2024, apiCalls: 150, limit: 100 },
      ];
      mockRepository.getOrganizationsExceedingLimit.mockResolvedValue(exceedingOrgs);

      const result = await service.getOrganizationsExceedingLimit();

      expect(result).toEqual(exceedingOrgs);
    });
  });

  describe('getTotalUsageForOrganization', () => {
    it('should return total usage statistics', async () => {
      const totalUsage = { totalApiCalls: 500, totalExtraCredits: 100 };
      mockRepository.getTotalUsageForOrganization.mockResolvedValue(totalUsage);

      const result = await service.getTotalUsageForOrganization('org-1');

      expect(result).toEqual(totalUsage);
    });
  });

  describe('private methods', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe('calculateUsageProjection', () => {
      it('should calculate accurate projections', async () => {
        // Test the projection calculation indirectly through getUsageStats
        mockRepository.getCurrentMonthUsage.mockResolvedValue(mockUsageRecord);
        mockRepository.getUsageHistory.mockResolvedValue([]);

        const result = await service.getUsageStats('org-1', { includeProjections: true });

        expect(result.projectedUsage).toBeDefined();
        expect(result.projectedUsage?.estimatedMonthlyUsage).toBeGreaterThan(0);
        expect(result.projectedUsage?.confidence).toBeGreaterThan(0);
      });
    });

    describe('getUpgradeOptions', () => {
      it('should return appropriate upgrade options based on remaining calls', async () => {
        // Test upgrade options indirectly through getUsageLimitResult
        const lowUsageRecord = { ...mockUsageRecord, apiCalls: 95 }; // Only 15 calls remaining
        mockRepository.getCurrentMonthUsage.mockResolvedValue(lowUsageRecord);

        const result = await service.getUsageLimitResult('org-1');

        expect(result.upgradeOptions).toBeDefined();
        expect(result.upgradeOptions?.length).toBeGreaterThan(0);
        expect(result.upgradeOptions?.[0].additionalCredits).toBeGreaterThan(0);
      });
    });
  });
});