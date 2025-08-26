import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AutomationLogService, WeeklyAutomationData, LogEntryUpdateData } from './automation.log.service';
import { AutomationLogRepository } from './automation.log.repository';
import { AutomationStatus, LogEntryStatus } from '../../../dtos/content-automation/interfaces';

describe('AutomationLogService', () => {
  let service: AutomationLogService;
  let repository: jest.Mocked<AutomationLogRepository>;

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

  const mockLogWithEntries = {
    ...mockAutomationLog,
    logEntries: [mockLogEntry],
  };

  beforeEach(async () => {
    const mockRepository = {
      createLog: jest.fn(),
      updateLog: jest.fn(),
      getLogById: jest.fn(),
      getLogWithEntries: jest.fn(),
      getLogsByContentPlanWithEntries: jest.fn(),
      getLogByWeekStart: jest.fn(),
      getCurrentWeekLog: jest.fn(),
      getOrCreateCurrentWeekLog: jest.fn(),
      getLogsWithFilters: jest.fn(),
      countLogsWithFilters: jest.fn(),
      getActiveLogsByStatus: jest.fn(),
      getLogsByWeekRange: jest.fn(),
      createLogEntry: jest.fn(),
      createLogEntries: jest.fn(),
      updateLogEntry: jest.fn(),
      getLogEntryById: jest.fn(),
      getPendingLogEntries: jest.fn(),
      deleteLog: jest.fn(),
      deleteLogEntriesByLog: jest.fn(),
      incrementLogCounters: jest.fn(),
      getWeeklyStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationLogService,
        {
          provide: AutomationLogRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AutomationLogService>(AutomationLogService);
    repository = module.get(AutomationLogRepository);
  });

  describe('startWeeklyAutomation', () => {
    it('should start weekly automation successfully', async () => {
      const weeklyData: WeeklyAutomationData = {
        contentPlanId: 'plan-1',
        weekStartDate: new Date('2024-01-01'),
        plannedPosts: [
          {
            postType: 'tweet',
            platform: 'twitter',
            contentCategory: 'educational',
            scheduledFor: new Date('2024-01-01T14:00:00Z'),
          },
          {
            postType: 'feed_post',
            platform: 'instagram',
            contentCategory: 'promotional',
          },
        ],
      };

      repository.getLogByWeekStart.mockResolvedValue(null);
      repository.createLog.mockResolvedValue(mockAutomationLog);
      repository.createLogEntries.mockResolvedValue(2);
      repository.updateLog.mockResolvedValue({
        ...mockAutomationLog,
        status: AutomationStatus.IN_PROGRESS,
      });

      const result = await service.startWeeklyAutomation(weeklyData);

      expect(repository.getLogByWeekStart).toHaveBeenCalledWith('plan-1', new Date('2024-01-01'));
      expect(repository.createLog).toHaveBeenCalledWith({
        contentPlanId: 'plan-1',
        weekStartDate: new Date('2024-01-01'),
        status: AutomationStatus.PENDING,
        totalPlanned: 2,
      });
      expect(repository.createLogEntries).toHaveBeenCalledWith([
        {
          automationLogId: 'log-1',
          postType: 'tweet',
          platform: 'twitter',
          contentCategory: 'educational',
          status: LogEntryStatus.PENDING,
          scheduledFor: new Date('2024-01-01T14:00:00Z'),
        },
        {
          automationLogId: 'log-1',
          postType: 'feed_post',
          platform: 'instagram',
          contentCategory: 'promotional',
          status: LogEntryStatus.PENDING,
          scheduledFor: undefined,
        },
      ]);
      expect(repository.updateLog).toHaveBeenCalledWith('log-1', {
        status: AutomationStatus.IN_PROGRESS,
      });
      expect(result.status).toBe(AutomationStatus.IN_PROGRESS);
    });

    it('should throw error if log already exists for the week', async () => {
      const weeklyData: WeeklyAutomationData = {
        contentPlanId: 'plan-1',
        weekStartDate: new Date('2024-01-01'),
        plannedPosts: [],
      };

      repository.getLogByWeekStart.mockResolvedValue(mockAutomationLog);

      await expect(service.startWeeklyAutomation(weeklyData)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.startWeeklyAutomation(weeklyData)).rejects.toThrow(
        'Automation log already exists for this week'
      );
    });
  });

  describe('getLogById', () => {
    it('should get log by id successfully', async () => {
      repository.getLogWithEntries.mockResolvedValue(mockLogWithEntries);

      const result = await service.getLogById('log-1');

      expect(repository.getLogWithEntries).toHaveBeenCalledWith('log-1');
      expect(result.id).toBe('log-1');
      expect(result.logEntries).toHaveLength(1);
    });

    it('should throw NotFoundException if log not found', async () => {
      repository.getLogWithEntries.mockResolvedValue(null);

      await expect(service.getLogById('non-existent')).rejects.toThrow(
        NotFoundException
      );
      await expect(service.getLogById('non-existent')).rejects.toThrow(
        'Automation log not found'
      );
    });
  });

  describe('getLogsByContentPlan', () => {
    it('should get logs by content plan', async () => {
      const logs = [mockLogWithEntries];
      repository.getLogsByContentPlanWithEntries.mockResolvedValue(logs);

      const result = await service.getLogsByContentPlan('plan-1');

      expect(repository.getLogsByContentPlanWithEntries).toHaveBeenCalledWith('plan-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('log-1');
    });
  });

  describe('getLogsWithFilters', () => {
    it('should get logs with filters and pagination', async () => {
      const filters = {
        contentPlanId: 'plan-1',
        status: [AutomationStatus.COMPLETED],
        page: 1,
        limit: 10,
      };

      const logs = [mockLogWithEntries];
      repository.getLogsWithFilters.mockResolvedValue(logs);
      repository.countLogsWithFilters.mockResolvedValue(1);

      const result = await service.getLogsWithFilters(filters);

      expect(repository.getLogsWithFilters).toHaveBeenCalledWith(
        {
          contentPlanId: 'plan-1',
          status: [AutomationStatus.COMPLETED],
        },
        10,
        0
      );
      expect(repository.countLogsWithFilters).toHaveBeenCalledWith({
        contentPlanId: 'plan-1',
        status: [AutomationStatus.COMPLETED],
      });
      expect(result.logs).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.summary).toBeDefined();
    });

    it('should use default pagination values', async () => {
      const filters = { contentPlanId: 'plan-1' };
      repository.getLogsWithFilters.mockResolvedValue([]);
      repository.countLogsWithFilters.mockResolvedValue(0);

      await service.getLogsWithFilters(filters);

      expect(repository.getLogsWithFilters).toHaveBeenCalledWith(
        { contentPlanId: 'plan-1' },
        20, // default limit
        0   // default offset for page 1
      );
    });
  });

  describe('updateLogEntry', () => {
    it('should update log entry successfully', async () => {
      const updateData: LogEntryUpdateData = {
        status: LogEntryStatus.SCHEDULED,
        postId: 'post-1',
        scheduledFor: new Date('2024-01-01T15:00:00Z'),
      };

      const updatedEntry = { ...mockLogEntry, ...updateData };

      repository.getLogEntryById.mockResolvedValue(mockLogEntry);
      repository.updateLogEntry.mockResolvedValue(updatedEntry);
      repository.incrementLogCounters.mockResolvedValue(mockAutomationLog);

      const result = await service.updateLogEntry('entry-1', updateData);

      expect(repository.getLogEntryById).toHaveBeenCalledWith('entry-1');
      expect(repository.updateLogEntry).toHaveBeenCalledWith('entry-1', updateData);
      expect(repository.incrementLogCounters).toHaveBeenCalledWith('log-1', {
        generated: 0,
        scheduled: 1,
        failed: -1, // decrement from PENDING, increment to SCHEDULED
      });
      expect(result.status).toBe(LogEntryStatus.SCHEDULED);
    });

    it('should throw NotFoundException if entry not found', async () => {
      repository.getLogEntryById.mockResolvedValue(null);

      await expect(
        service.updateLogEntry('non-existent', { status: LogEntryStatus.SCHEDULED })
      ).rejects.toThrow(NotFoundException);
    });

    it('should not update counters if status unchanged', async () => {
      const updateData: LogEntryUpdateData = {
        postId: 'post-1',
      };

      repository.getLogEntryById.mockResolvedValue(mockLogEntry);
      repository.updateLogEntry.mockResolvedValue({ ...mockLogEntry, postId: 'post-1' });

      await service.updateLogEntry('entry-1', updateData);

      expect(repository.incrementLogCounters).not.toHaveBeenCalled();
    });
  });

  describe('markEntryAsGenerated', () => {
    it('should mark entry as generated', async () => {
      const updatedEntry = { ...mockLogEntry, status: LogEntryStatus.GENERATED, postId: 'post-1' };

      repository.getLogEntryById.mockResolvedValue(mockLogEntry);
      repository.updateLogEntry.mockResolvedValue(updatedEntry);
      repository.incrementLogCounters.mockResolvedValue(mockAutomationLog);

      const result = await service.markEntryAsGenerated('entry-1', 'post-1');

      expect(repository.updateLogEntry).toHaveBeenCalledWith('entry-1', {
        status: LogEntryStatus.GENERATED,
        postId: 'post-1',
      });
      expect(result.status).toBe(LogEntryStatus.GENERATED);
    });
  });

  describe('markEntryAsScheduled', () => {
    it('should mark entry as scheduled', async () => {
      const scheduledFor = new Date('2024-01-01T15:00:00Z');
      const updatedEntry = {
        ...mockLogEntry,
        status: LogEntryStatus.SCHEDULED,
        postId: 'post-1',
        scheduledFor,
      };

      repository.getLogEntryById.mockResolvedValue(mockLogEntry);
      repository.updateLogEntry.mockResolvedValue(updatedEntry);
      repository.incrementLogCounters.mockResolvedValue(mockAutomationLog);

      const result = await service.markEntryAsScheduled('entry-1', 'post-1', scheduledFor);

      expect(repository.updateLogEntry).toHaveBeenCalledWith('entry-1', {
        status: LogEntryStatus.SCHEDULED,
        postId: 'post-1',
        scheduledFor,
      });
      expect(result.status).toBe(LogEntryStatus.SCHEDULED);
    });
  });

  describe('markEntryAsFailed', () => {
    it('should mark entry as failed', async () => {
      const errorMessage = 'Generation failed';
      const updatedEntry = {
        ...mockLogEntry,
        status: LogEntryStatus.FAILED,
        errorMessage,
      };

      repository.getLogEntryById.mockResolvedValue(mockLogEntry);
      repository.updateLogEntry.mockResolvedValue(updatedEntry);
      repository.incrementLogCounters.mockResolvedValue(mockAutomationLog);

      const result = await service.markEntryAsFailed('entry-1', errorMessage);

      expect(repository.updateLogEntry).toHaveBeenCalledWith('entry-1', {
        status: LogEntryStatus.FAILED,
        errorMessage,
      });
      expect(result.status).toBe(LogEntryStatus.FAILED);
    });
  });

  describe('updateLogStatus', () => {
    it('should update log status', async () => {
      const updatedLog = { ...mockAutomationLog, status: AutomationStatus.COMPLETED };

      repository.updateLog.mockResolvedValue(updatedLog);
      repository.getLogWithEntries.mockResolvedValue({ ...updatedLog, logEntries: [] });

      const result = await service.updateLogStatus('log-1', AutomationStatus.COMPLETED);

      expect(repository.updateLog).toHaveBeenCalledWith('log-1', {
        status: AutomationStatus.COMPLETED,
        errorDetails: undefined,
      });
      expect(result.status).toBe(AutomationStatus.COMPLETED);
    });

    it('should update log status with error details', async () => {
      const errorDetails = { error: 'API limit exceeded' };
      const updatedLog = { ...mockAutomationLog, status: AutomationStatus.FAILED, errorDetails };

      repository.updateLog.mockResolvedValue(updatedLog);
      repository.getLogWithEntries.mockResolvedValue({ ...updatedLog, logEntries: [] });

      const result = await service.updateLogStatus('log-1', AutomationStatus.FAILED, errorDetails);

      expect(repository.updateLog).toHaveBeenCalledWith('log-1', {
        status: AutomationStatus.FAILED,
        errorDetails,
      });
      expect(result.errorDetails).toEqual(errorDetails);
    });
  });

  describe('completeLog', () => {
    it('should complete log when all entries are finished', async () => {
      const completedLogWithEntries = {
        ...mockAutomationLog,
        logEntries: [
          { ...mockLogEntry, status: LogEntryStatus.SCHEDULED },
          { ...mockLogEntry, id: 'entry-2', status: LogEntryStatus.FAILED },
        ],
      };

      repository.getLogWithEntries.mockResolvedValue(completedLogWithEntries);
      repository.updateLog.mockResolvedValue({ ...mockAutomationLog, status: AutomationStatus.COMPLETED });
      repository.getLogWithEntries.mockResolvedValueOnce(completedLogWithEntries)
        .mockResolvedValueOnce({ ...completedLogWithEntries, status: AutomationStatus.COMPLETED });

      const result = await service.completeLog('log-1');

      expect(repository.updateLog).toHaveBeenCalledWith('log-1', {
        status: AutomationStatus.COMPLETED,
        errorDetails: undefined,
      });
      expect(result.status).toBe(AutomationStatus.COMPLETED);
    });

    it('should throw error if log has pending entries', async () => {
      const logWithPendingEntries = {
        ...mockAutomationLog,
        logEntries: [
          { ...mockLogEntry, status: LogEntryStatus.PENDING },
          { ...mockLogEntry, id: 'entry-2', status: LogEntryStatus.SCHEDULED },
        ],
      };

      repository.getLogWithEntries.mockResolvedValue(logWithPendingEntries);

      await expect(service.completeLog('log-1')).rejects.toThrow(BadRequestException);
      await expect(service.completeLog('log-1')).rejects.toThrow(
        'Cannot complete log with pending entries'
      );
    });

    it('should throw error if log not found', async () => {
      repository.getLogWithEntries.mockResolvedValue(null);

      await expect(service.completeLog('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getWeeklyStats', () => {
    it('should get weekly stats', async () => {
      const stats = {
        totalWeeks: 4,
        successfulWeeks: 3,
        failedWeeks: 1,
        totalPostsGenerated: 15,
        totalPostsScheduled: 12,
        totalPostsFailed: 3,
        averageSuccessRate: 80,
      };

      repository.getWeeklyStats.mockResolvedValue(stats);

      const result = await service.getWeeklyStats('plan-1', 4);

      expect(repository.getWeeklyStats).toHaveBeenCalledWith('plan-1', 4);
      expect(result).toEqual(stats);
    });

    it('should use default week count', async () => {
      repository.getWeeklyStats.mockResolvedValue({
        totalWeeks: 4,
        successfulWeeks: 3,
        failedWeeks: 1,
        totalPostsGenerated: 15,
        totalPostsScheduled: 12,
        totalPostsFailed: 3,
        averageSuccessRate: 80,
      });

      await service.getWeeklyStats('plan-1');

      expect(repository.getWeeklyStats).toHaveBeenCalledWith('plan-1', 4);
    });
  });

  describe('deleteLog', () => {
    it('should delete log and its entries', async () => {
      repository.getLogById.mockResolvedValue(mockAutomationLog);
      repository.deleteLogEntriesByLog.mockResolvedValue(2);
      repository.deleteLog.mockResolvedValue(mockAutomationLog);

      await service.deleteLog('log-1');

      expect(repository.getLogById).toHaveBeenCalledWith('log-1');
      expect(repository.deleteLogEntriesByLog).toHaveBeenCalledWith('log-1');
      expect(repository.deleteLog).toHaveBeenCalledWith('log-1');
    });

    it('should throw error if log not found', async () => {
      repository.getLogById.mockResolvedValue(null);

      await expect(service.deleteLog('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteOldLogs', () => {
    it('should delete old logs', async () => {
      const oldLogs = [
        { ...mockAutomationLog, id: 'old-log-1' },
        { ...mockAutomationLog, id: 'old-log-2' },
      ];

      repository.getLogsByWeekRange.mockResolvedValue(oldLogs);
      repository.getLogById.mockResolvedValueOnce({ ...mockAutomationLog, id: 'old-log-1' })
        .mockResolvedValueOnce({ ...mockAutomationLog, id: 'old-log-2' });
      repository.deleteLogEntriesByLog.mockResolvedValue(1);
      repository.deleteLog.mockResolvedValue(mockAutomationLog);

      const result = await service.deleteOldLogs('plan-1', 90);

      expect(repository.getLogsByWeekRange).toHaveBeenCalledWith(
        'plan-1',
        new Date('2000-01-01'),
        expect.any(Date)
      );
      expect(result).toBe(2);
    });
  });

  describe('getCurrentWeekLog', () => {
    it('should get current week log', async () => {
      repository.getCurrentWeekLog.mockResolvedValue(mockAutomationLog);
      repository.getLogWithEntries.mockResolvedValue(mockLogWithEntries);

      const result = await service.getCurrentWeekLog('plan-1');

      expect(repository.getCurrentWeekLog).toHaveBeenCalledWith('plan-1');
      expect(repository.getLogWithEntries).toHaveBeenCalledWith('log-1');
      expect(result?.id).toBe('log-1');
    });

    it('should return null if no current week log', async () => {
      repository.getCurrentWeekLog.mockResolvedValue(null);

      const result = await service.getCurrentWeekLog('plan-1');

      expect(result).toBeNull();
    });
  });

  describe('getPendingLogEntries', () => {
    it('should get pending log entries', async () => {
      const pendingEntries = [mockLogEntry];
      repository.getPendingLogEntries.mockResolvedValue(pendingEntries);

      const result = await service.getPendingLogEntries();

      expect(repository.getPendingLogEntries).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(LogEntryStatus.PENDING);
    });
  });
});