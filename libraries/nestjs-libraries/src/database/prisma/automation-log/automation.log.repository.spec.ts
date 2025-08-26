import { Test, TestingModule } from '@nestjs/testing';
import { AutomationLogRepository, CreateAutomationLogData, CreateAutomationLogEntryData, AutomationLogFilters } from './automation.log.repository';
import { PrismaRepository } from '../prisma.service';
import { AutomationStatus, LogEntryStatus } from '../../../dtos/content-automation/interfaces';

describe('AutomationLogRepository', () => {
  let repository: AutomationLogRepository;
  let mockAutomationLogPrisma: any;
  let mockAutomationLogEntryPrisma: any;

  const mockAutomationLog = {
    id: 'log-1',
    contentPlanId: 'plan-1',
    weekStartDate: new Date('2024-01-01'),
    status: AutomationStatus.PENDING,
    totalPlanned: 5,
    totalGenerated: 0,
    totalScheduled: 0,
    totalFailed: 0,
    errorDetails: null,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
  };

  const mockLogEntry = {
    id: 'entry-1',
    automationLogId: 'log-1',
    postType: 'tweet',
    platform: 'twitter',
    contentCategory: 'educational',
    status: LogEntryStatus.PENDING,
    scheduledFor: new Date('2024-01-01T14:00:00Z'),
    postId: null,
    errorMessage: null,
    createdAt: new Date('2024-01-01T10:00:00Z'),
  };

  beforeEach(async () => {
    mockAutomationLogPrisma = {
      model: {
        automationLogAI: {
          create: jest.fn(),
          update: jest.fn(),
          findUnique: jest.fn(),
          findMany: jest.fn(),
          findFirst: jest.fn(),
          delete: jest.fn(),
          count: jest.fn(),
        },
      },
    };

    mockAutomationLogEntryPrisma = {
      model: {
        automationLogEntryAI: {
          create: jest.fn(),
          createMany: jest.fn(),
          update: jest.fn(),
          findUnique: jest.fn(),
          findMany: jest.fn(),
          delete: jest.fn(),
          deleteMany: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationLogRepository,
        {
          provide: PrismaRepository,
          useValue: mockAutomationLogPrisma,
        },
      ],
    })
      .overrideProvider(PrismaRepository)
      .useValue(mockAutomationLogPrisma)
      .compile();

    repository = module.get<AutomationLogRepository>(AutomationLogRepository);

    // Manually inject the second PrismaRepository for automationLogEntry
    (repository as any)._automationLogEntry = mockAutomationLogEntryPrisma;
  });

  describe('createLog', () => {
    it('should create an automation log', async () => {
      const createData: CreateAutomationLogData = {
        contentPlanId: 'plan-1',
        weekStartDate: new Date('2024-01-01'),
        status: AutomationStatus.PENDING,
        totalPlanned: 5,
      };

      mockAutomationLogPrisma.model.automationLogAI.create.mockResolvedValue(mockAutomationLog);

      const result = await repository.createLog(createData);

      expect(mockAutomationLogPrisma.model.automationLogAI.create).toHaveBeenCalledWith({
        data: {
          contentPlanId: 'plan-1',
          weekStartDate: new Date('2024-01-01'),
          status: AutomationStatus.PENDING,
          totalPlanned: 5,
          totalGenerated: 0,
          totalScheduled: 0,
          totalFailed: 0,
          errorDetails: undefined,
        },
      });
      expect(result).toEqual(mockAutomationLog);
    });

    it('should create an automation log with optional fields', async () => {
      const createData: CreateAutomationLogData = {
        contentPlanId: 'plan-1',
        weekStartDate: new Date('2024-01-01'),
        status: AutomationStatus.IN_PROGRESS,
        totalPlanned: 5,
        totalGenerated: 2,
        totalScheduled: 1,
        totalFailed: 1,
        errorDetails: { error: 'test error' },
      };

      mockAutomationLogPrisma.model.automationLogAI.create.mockResolvedValue(mockAutomationLog);

      await repository.createLog(createData);

      expect(mockAutomationLogPrisma.model.automationLogAI.create).toHaveBeenCalledWith({
        data: {
          contentPlanId: 'plan-1',
          weekStartDate: new Date('2024-01-01'),
          status: AutomationStatus.IN_PROGRESS,
          totalPlanned: 5,
          totalGenerated: 2,
          totalScheduled: 1,
          totalFailed: 1,
          errorDetails: { error: 'test error' },
        },
      });
    });
  });

  describe('updateLog', () => {
    it('should update an automation log', async () => {
      const updateData = {
        status: AutomationStatus.COMPLETED,
        totalGenerated: 5,
        totalScheduled: 4,
        totalFailed: 1,
      };

      const updatedLog = { ...mockAutomationLog, ...updateData };
      mockAutomationLogPrisma.model.automationLogAI.update.mockResolvedValue(updatedLog);

      const result = await repository.updateLog('log-1', updateData);

      expect(mockAutomationLogPrisma.model.automationLogAI.update).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: {
          status: AutomationStatus.COMPLETED,
          totalGenerated: 5,
          totalScheduled: 4,
          totalFailed: 1,
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(updatedLog);
    });

    it('should update only provided fields', async () => {
      const updateData = { status: AutomationStatus.PAUSED };
      mockAutomationLogPrisma.model.automationLogAI.update.mockResolvedValue(mockAutomationLog);

      await repository.updateLog('log-1', updateData);

      expect(mockAutomationLogPrisma.model.automationLogAI.update).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: {
          status: AutomationStatus.PAUSED,
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe('getLogById', () => {
    it('should get a log by id', async () => {
      mockAutomationLogPrisma.model.automationLogAI.findUnique.mockResolvedValue(mockAutomationLog);

      const result = await repository.getLogById('log-1');

      expect(mockAutomationLogPrisma.model.automationLogAI.findUnique).toHaveBeenCalledWith({
        where: { id: 'log-1' },
      });
      expect(result).toEqual(mockAutomationLog);
    });

    it('should return null if log not found', async () => {
      mockAutomationLogPrisma.model.automationLogAI.findUnique.mockResolvedValue(null);

      const result = await repository.getLogById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getLogWithEntries', () => {
    it('should get a log with its entries', async () => {
      const logWithEntries = {
        ...mockAutomationLog,
        logEntries: [mockLogEntry],
      };

      mockAutomationLogPrisma.model.automationLogAI.findUnique.mockResolvedValue(logWithEntries);

      const result = await repository.getLogWithEntries('log-1');

      expect(mockAutomationLogPrisma.model.automationLogAI.findUnique).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        include: {
          logEntries: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });
      expect(result).toEqual(logWithEntries);
    });
  });

  describe('getLogsByContentPlan', () => {
    it('should get logs by content plan id', async () => {
      const logs = [mockAutomationLog];
      mockAutomationLogPrisma.model.automationLogAI.findMany.mockResolvedValue(logs);

      const result = await repository.getLogsByContentPlan('plan-1');

      expect(mockAutomationLogPrisma.model.automationLogAI.findMany).toHaveBeenCalledWith({
        where: { contentPlanId: 'plan-1' },
        orderBy: { weekStartDate: 'desc' },
      });
      expect(result).toEqual(logs);
    });
  });

  describe('getLogByWeekStart', () => {
    it('should get log by content plan and week start date', async () => {
      const weekStart = new Date('2024-01-01');
      mockAutomationLogPrisma.model.automationLogAI.findFirst.mockResolvedValue(mockAutomationLog);

      const result = await repository.getLogByWeekStart('plan-1', weekStart);

      expect(mockAutomationLogPrisma.model.automationLogAI.findFirst).toHaveBeenCalledWith({
        where: {
          contentPlanId: 'plan-1',
          weekStartDate: weekStart,
        },
      });
      expect(result).toEqual(mockAutomationLog);
    });
  });

  describe('getLogsWithFilters', () => {
    it('should get logs with basic filters', async () => {
      const filters: AutomationLogFilters = {
        contentPlanId: 'plan-1',
        status: [AutomationStatus.COMPLETED],
      };

      const logs = [{ ...mockAutomationLog, logEntries: [mockLogEntry] }];
      mockAutomationLogPrisma.model.automationLogAI.findMany.mockResolvedValue(logs);

      const result = await repository.getLogsWithFilters(filters, 10, 0);

      expect(mockAutomationLogPrisma.model.automationLogAI.findMany).toHaveBeenCalledWith({
        where: {
          contentPlanId: 'plan-1',
          status: { in: [AutomationStatus.COMPLETED] },
        },
        include: {
          logEntries: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { weekStartDate: 'desc' },
        take: 10,
        skip: 0,
      });
      expect(result).toEqual(logs);
    });

    it('should get logs with date range filter', async () => {
      const filters: AutomationLogFilters = {
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
      };

      mockAutomationLogPrisma.model.automationLogAI.findMany.mockResolvedValue([]);

      await repository.getLogsWithFilters(filters);

      expect(mockAutomationLogPrisma.model.automationLogAI.findMany).toHaveBeenCalledWith({
        where: {
          weekStartDate: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-01-31'),
          },
        },
        include: {
          logEntries: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { weekStartDate: 'desc' },
      });
    });

    it('should get logs with platform filters', async () => {
      const filters: AutomationLogFilters = {
        platforms: ['twitter', 'instagram'],
      };

      mockAutomationLogPrisma.model.automationLogAI.findMany.mockResolvedValue([]);

      await repository.getLogsWithFilters(filters);

      expect(mockAutomationLogPrisma.model.automationLogAI.findMany).toHaveBeenCalledWith({
        where: {
          logEntries: {
            some: {
              platform: { in: ['twitter', 'instagram'] },
            },
          },
        },
        include: {
          logEntries: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { weekStartDate: 'desc' },
      });
    });
  });

  describe('createLogEntry', () => {
    it('should create a log entry', async () => {
      const entryData: CreateAutomationLogEntryData = {
        automationLogId: 'log-1',
        postType: 'tweet',
        platform: 'twitter',
        contentCategory: 'educational',
        status: LogEntryStatus.PENDING,
        scheduledFor: new Date('2024-01-01T14:00:00Z'),
      };

      mockAutomationLogEntryPrisma.model.automationLogEntryAI.create.mockResolvedValue(mockLogEntry);

      const result = await repository.createLogEntry(entryData);

      expect(mockAutomationLogEntryPrisma.model.automationLogEntryAI.create).toHaveBeenCalledWith({
        data: entryData,
      });
      expect(result).toEqual(mockLogEntry);
    });
  });

  describe('createLogEntries', () => {
    it('should create multiple log entries', async () => {
      const entriesData: CreateAutomationLogEntryData[] = [
        {
          automationLogId: 'log-1',
          postType: 'tweet',
          platform: 'twitter',
          contentCategory: 'educational',
          status: LogEntryStatus.PENDING,
        },
        {
          automationLogId: 'log-1',
          postType: 'feed_post',
          platform: 'instagram',
          contentCategory: 'promotional',
          status: LogEntryStatus.PENDING,
        },
      ];

      mockAutomationLogEntryPrisma.model.automationLogEntryAI.createMany.mockResolvedValue({ count: 2 });

      const result = await repository.createLogEntries(entriesData);

      expect(mockAutomationLogEntryPrisma.model.automationLogEntryAI.createMany).toHaveBeenCalledWith({
        data: entriesData,
      });
      expect(result).toBe(2);
    });
  });

  describe('updateLogEntry', () => {
    it('should update a log entry', async () => {
      const updateData = {
        status: LogEntryStatus.SCHEDULED,
        postId: 'post-1',
        scheduledFor: new Date('2024-01-01T15:00:00Z'),
      };

      const updatedEntry = { ...mockLogEntry, ...updateData };
      mockAutomationLogEntryPrisma.model.automationLogEntryAI.update.mockResolvedValue(updatedEntry);

      const result = await repository.updateLogEntry('entry-1', updateData);

      expect(mockAutomationLogEntryPrisma.model.automationLogEntryAI.update).toHaveBeenCalledWith({
        where: { id: 'entry-1' },
        data: updateData,
      });
      expect(result).toEqual(updatedEntry);
    });
  });

  describe('getPendingLogEntries', () => {
    it('should get pending log entries', async () => {
      const pendingEntries = [mockLogEntry];
      mockAutomationLogEntryPrisma.model.automationLogEntryAI.findMany.mockResolvedValue(pendingEntries);

      const result = await repository.getPendingLogEntries();

      expect(mockAutomationLogEntryPrisma.model.automationLogEntryAI.findMany).toHaveBeenCalledWith({
        where: { status: LogEntryStatus.PENDING },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toEqual(pendingEntries);
    });
  });

  describe('getCurrentWeekLog', () => {
    it('should get current week log', async () => {
      const mockDate = new Date('2024-01-03T10:00:00Z'); // Wednesday
      jest.spyOn(Date, 'now').mockImplementation(() => mockDate.getTime());

      mockAutomationLogPrisma.model.automationLogAI.findFirst.mockResolvedValue(mockAutomationLog);

      const result = await repository.getCurrentWeekLog('plan-1');

      // Monday of the week containing January 3rd, 2024 should be January 1st
      const expectedWeekStart = new Date('2024-01-01T00:00:00.000Z');

      expect(mockAutomationLogPrisma.model.automationLogAI.findFirst).toHaveBeenCalledWith({
        where: {
          contentPlanId: 'plan-1',
          weekStartDate: expectedWeekStart,
        },
      });
      expect(result).toEqual(mockAutomationLog);

      jest.restoreAllMocks();
    });
  });

  describe('getOrCreateCurrentWeekLog', () => {
    it('should return existing log if found', async () => {
      const mockDate = new Date('2024-01-03T10:00:00Z');
      jest.spyOn(Date, 'now').mockImplementation(() => mockDate.getTime());

      mockAutomationLogPrisma.model.automationLogAI.findFirst.mockResolvedValue(mockAutomationLog);

      const result = await repository.getOrCreateCurrentWeekLog('plan-1', 5);

      expect(result).toEqual(mockAutomationLog);
      expect(mockAutomationLogPrisma.model.automationLogAI.create).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });

    it('should create new log if not found', async () => {
      const mockDate = new Date('2024-01-03T10:00:00Z');
      jest.spyOn(Date, 'now').mockImplementation(() => mockDate.getTime());

      mockAutomationLogPrisma.model.automationLogAI.findFirst.mockResolvedValue(null);
      mockAutomationLogPrisma.model.automationLogAI.create.mockResolvedValue(mockAutomationLog);

      const result = await repository.getOrCreateCurrentWeekLog('plan-1', 5);

      expect(mockAutomationLogPrisma.model.automationLogAI.create).toHaveBeenCalledWith({
        data: {
          contentPlanId: 'plan-1',
          weekStartDate: new Date('2024-01-01T00:00:00.000Z'),
          status: AutomationStatus.PENDING,
          totalPlanned: 5,
        },
      });
      expect(result).toEqual(mockAutomationLog);

      jest.restoreAllMocks();
    });
  });

  describe('incrementLogCounters', () => {
    it('should increment log counters', async () => {
      const existingLog = {
        ...mockAutomationLog,
        totalGenerated: 2,
        totalScheduled: 1,
        totalFailed: 0,
      };

      mockAutomationLogPrisma.model.automationLogAI.findUnique.mockResolvedValue(existingLog);
      mockAutomationLogPrisma.model.automationLogAI.update.mockResolvedValue({
        ...existingLog,
        totalGenerated: 3,
        totalScheduled: 2,
        totalFailed: 1,
      });

      const result = await repository.incrementLogCounters('log-1', {
        generated: 1,
        scheduled: 1,
        failed: 1,
      });

      expect(mockAutomationLogPrisma.model.automationLogAI.update).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: {
          totalGenerated: 3,
          totalScheduled: 2,
          totalFailed: 1,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should throw error if log not found', async () => {
      mockAutomationLogPrisma.model.automationLogAI.findUnique.mockResolvedValue(null);

      await expect(
        repository.incrementLogCounters('non-existent', { generated: 1 })
      ).rejects.toThrow('Automation log not found');
    });
  });

  describe('getWeeklyStats', () => {
    it('should calculate weekly stats', async () => {
      const logs = [
        { ...mockAutomationLog, status: AutomationStatus.COMPLETED, totalGenerated: 5, totalScheduled: 4, totalFailed: 1, totalPlanned: 5 },
        { ...mockAutomationLog, status: AutomationStatus.FAILED, totalGenerated: 2, totalScheduled: 1, totalFailed: 3, totalPlanned: 5 },
        { ...mockAutomationLog, status: AutomationStatus.COMPLETED, totalGenerated: 3, totalScheduled: 3, totalFailed: 0, totalPlanned: 3 },
      ];

      mockAutomationLogPrisma.model.automationLogAI.findMany.mockResolvedValue(logs);

      const result = await repository.getWeeklyStats('plan-1', 4);

      expect(result).toEqual({
        totalWeeks: 3,
        successfulWeeks: 2,
        failedWeeks: 1,
        totalPostsGenerated: 10,
        totalPostsScheduled: 8,
        totalPostsFailed: 4,
        averageSuccessRate: (8 / 13) * 100, // 8 scheduled out of 13 planned
      });
    });
  });
});