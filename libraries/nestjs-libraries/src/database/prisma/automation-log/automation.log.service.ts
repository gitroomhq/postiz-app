import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AutomationLogRepository, AutomationLogFilters, CreateAutomationLogData, CreateAutomationLogEntryData } from './automation.log.repository';
import { AutomationLogResponseDto, AutomationLogListResponseDto, AutomationLogEntryResponseDto } from '../../../dtos/content-automation/response.dtos';
import { AutomationStatus, LogEntryStatus } from '../../../dtos/content-automation/interfaces';
import { AutomationLog, AutomationLogEntry } from '@prisma/client';

export interface AutomationLogFiltersDto {
  contentPlanId?: string;
  status?: AutomationStatus[];
  platforms?: string[];
  contentCategories?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  weekStartDate?: Date;
  page?: number;
  limit?: number;
}

export interface WeeklyAutomationData {
  contentPlanId: string;
  weekStartDate: Date;
  plannedPosts: {
    postType: string;
    platform: string;
    contentCategory: string;
    scheduledFor?: Date;
  }[];
}

export interface LogEntryUpdateData {
  status?: LogEntryStatus;
  scheduledFor?: Date;
  postId?: string;
  errorMessage?: string;
}

@Injectable()
export class AutomationLogService {
  constructor(
    private readonly automationLogRepository: AutomationLogRepository,
  ) { }

  async startWeeklyAutomation(data: WeeklyAutomationData): Promise<AutomationLogResponseDto> {
    const existingLog = await this.automationLogRepository.getLogByWeekStart(
      data.contentPlanId,
      data.weekStartDate
    );

    if (existingLog) {
      throw new BadRequestException('Automation log already exists for this week');
    }

    const logData: CreateAutomationLogData = {
      contentPlanId: data.contentPlanId,
      weekStartDate: data.weekStartDate,
      status: AutomationStatus.PENDING,
      totalPlanned: data.plannedPosts.length,
    };

    const automationLog = await this.automationLogRepository.createLog(logData);

    const logEntries: CreateAutomationLogEntryData[] = data.plannedPosts.map(post => ({
      automationLogId: automationLog.id,
      postType: post.postType,
      platform: post.platform,
      contentCategory: post.contentCategory,
      status: LogEntryStatus.PENDING,
      scheduledFor: post.scheduledFor,
    }));

    await this.automationLogRepository.createLogEntries(logEntries);

    const updatedLog = await this.automationLogRepository.updateLog(automationLog.id, {
      status: AutomationStatus.IN_PROGRESS,
    });

    return this.mapLogToResponseDto(updatedLog);
  }

  async getLogById(id: string): Promise<AutomationLogResponseDto> {
    const log = await this.automationLogRepository.getLogWithEntries(id);
    if (!log) {
      throw new NotFoundException('Automation log not found');
    }

    return this.mapLogWithEntriesToResponseDto(log);
  }

  async getLogsByContentPlan(contentPlanId: string): Promise<AutomationLogResponseDto[]> {
    const logs = await this.automationLogRepository.getLogsByContentPlanWithEntries(contentPlanId);
    return logs.map(log => this.mapLogWithEntriesToResponseDto(log));
  }

  async getLogsWithFilters(filters: AutomationLogFiltersDto): Promise<AutomationLogListResponseDto> {
    const { page = 1, limit = 20, ...filterParams } = filters;
    const offset = (page - 1) * limit;

    const repositoryFilters: AutomationLogFilters = {
      contentPlanId: filterParams.contentPlanId,
      status: filterParams.status,
      platforms: filterParams.platforms,
      contentCategories: filterParams.contentCategories,
      dateRange: filterParams.dateRange,
      weekStartDate: filterParams.weekStartDate,
    };

    const [logs, total] = await Promise.all([
      this.automationLogRepository.getLogsWithFilters(repositoryFilters, limit, offset),
      this.automationLogRepository.countLogsWithFilters(repositoryFilters),
    ]);

    const logDtos = logs.map(log => this.mapLogWithEntriesToResponseDto(log));

    const summary = await this.calculateLogsSummary(logs);

    return {
      logs: logDtos,
      total,
      summary,
    };
  }

  async getCurrentWeekLog(contentPlanId: string): Promise<AutomationLogResponseDto | null> {
    const log = await this.automationLogRepository.getCurrentWeekLog(contentPlanId);
    if (!log) {
      return null;
    }

    const logWithEntries = await this.automationLogRepository.getLogWithEntries(log.id);
    return logWithEntries ? this.mapLogWithEntriesToResponseDto(logWithEntries) : null;
  }

  async getOrCreateCurrentWeekLog(contentPlanId: string, totalPlanned: number): Promise<AutomationLogResponseDto> {
    const log = await this.automationLogRepository.getOrCreateCurrentWeekLog(contentPlanId, totalPlanned);
    const logWithEntries = await this.automationLogRepository.getLogWithEntries(log.id);

    if (!logWithEntries) {
      throw new Error('Failed to retrieve created automation log');
    }

    return this.mapLogWithEntriesToResponseDto(logWithEntries);
  }

  async updateLogEntry(entryId: string, data: LogEntryUpdateData): Promise<AutomationLogEntryResponseDto> {
    const entry = await this.automationLogRepository.getLogEntryById(entryId);
    if (!entry) {
      throw new NotFoundException('Automation log entry not found');
    }

    const updatedEntry = await this.automationLogRepository.updateLogEntry(entryId, data);

    if (data.status && data.status !== entry.status) {
      await this.updateLogCountersFromEntry(entry.automationLogId, entry.status as LogEntryStatus, data.status);
    }

    return this.mapLogEntryToResponseDto(updatedEntry);
  }

  async markEntryAsGenerated(entryId: string, postId?: string): Promise<AutomationLogEntryResponseDto> {
    return this.updateLogEntry(entryId, {
      status: LogEntryStatus.GENERATED,
      postId,
    });
  }

  async markEntryAsScheduled(entryId: string, postId: string, scheduledFor: Date): Promise<AutomationLogEntryResponseDto> {
    return this.updateLogEntry(entryId, {
      status: LogEntryStatus.SCHEDULED,
      postId,
      scheduledFor,
    });
  }

  async markEntryAsFailed(entryId: string, errorMessage: string): Promise<AutomationLogEntryResponseDto> {
    return this.updateLogEntry(entryId, {
      status: LogEntryStatus.FAILED,
      errorMessage,
    });
  }

  async getPendingLogEntries(): Promise<AutomationLogEntryResponseDto[]> {
    const entries = await this.automationLogRepository.getPendingLogEntries();
    return entries.map(entry => this.mapLogEntryToResponseDto(entry));
  }

  async updateLogStatus(logId: string, status: AutomationStatus, errorDetails?: any): Promise<AutomationLogResponseDto> {
    const updatedLog = await this.automationLogRepository.updateLog(logId, {
      status,
      errorDetails,
    });

    const logWithEntries = await this.automationLogRepository.getLogWithEntries(logId);
    if (!logWithEntries) {
      throw new Error('Failed to retrieve updated automation log');
    }

    return this.mapLogWithEntriesToResponseDto(logWithEntries);
  }

  async completeLog(logId: string): Promise<AutomationLogResponseDto> {
    const log = await this.automationLogRepository.getLogWithEntries(logId);
    if (!log) {
      throw new NotFoundException('Automation log not found');
    }

    // Check if all entries are completed (either SCHEDULED or FAILED)
    const completedStatuses = [LogEntryStatus.SCHEDULED, LogEntryStatus.FAILED];
    const allCompleted = log.logEntries.every(entry => completedStatuses.includes(entry.status as LogEntryStatus));

    if (!allCompleted) {
      throw new BadRequestException('Cannot complete log with pending entries');
    }

    return this.updateLogStatus(logId, AutomationStatus.COMPLETED);
  }

  async pauseLog(logId: string): Promise<AutomationLogResponseDto> {
    return this.updateLogStatus(logId, AutomationStatus.PAUSED);
  }

  async resumeLog(logId: string): Promise<AutomationLogResponseDto> {
    return this.updateLogStatus(logId, AutomationStatus.IN_PROGRESS);
  }

  async failLog(logId: string, errorDetails: any): Promise<AutomationLogResponseDto> {
    return this.updateLogStatus(logId, AutomationStatus.FAILED, errorDetails);
  }

  async getWeeklyStats(contentPlanId: string, weekCount: number = 4): Promise<{
    totalWeeks: number;
    successfulWeeks: number;
    failedWeeks: number;
    totalPostsGenerated: number;
    totalPostsScheduled: number;
    totalPostsFailed: number;
    averageSuccessRate: number;
  }> {
    return this.automationLogRepository.getWeeklyStats(contentPlanId, weekCount);
  }

  async getLogsByDateRange(contentPlanId: string, startDate: Date, endDate: Date): Promise<AutomationLogResponseDto[]> {
    const logs = await this.automationLogRepository.getLogsByWeekRange(contentPlanId, startDate, endDate);
    const logsWithEntries = await Promise.all(
      logs.map(log => this.automationLogRepository.getLogWithEntries(log.id))
    );

    return logsWithEntries
      .filter(log => log !== null)
      .map(log => this.mapLogWithEntriesToResponseDto(log!));
  }

  async getActiveAutomationLogs(): Promise<AutomationLogResponseDto[]> {
    const activeLogs = await this.automationLogRepository.getActiveLogsByStatus([
      AutomationStatus.PENDING,
      AutomationStatus.IN_PROGRESS,
    ]);

    const logsWithEntries = await Promise.all(
      activeLogs.map(log => this.automationLogRepository.getLogWithEntries(log.id))
    );

    return logsWithEntries
      .filter(log => log !== null)
      .map(log => this.mapLogWithEntriesToResponseDto(log!));
  }

  async deleteLog(logId: string): Promise<void> {
    const log = await this.automationLogRepository.getLogById(logId);
    if (!log) {
      throw new NotFoundException('Automation log not found');
    }

    await this.automationLogRepository.deleteLogEntriesByLog(logId);

    await this.automationLogRepository.deleteLog(logId);
  }

  async deleteOldLogs(contentPlanId: string, olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const oldLogs = await this.automationLogRepository.getLogsByWeekRange(
      contentPlanId,
      new Date('2000-01-01'),
      cutoffDate
    );

    let deletedCount = 0;
    for (const log of oldLogs) {
      await this.deleteLog(log.id);
      deletedCount++;
    }

    return deletedCount;
  }

  private async updateLogCountersFromEntry(
    logId: string,
    oldStatus: LogEntryStatus,
    newStatus: LogEntryStatus
  ): Promise<void> {
    const counters = { generated: 0, scheduled: 0, failed: 0 };

    if (oldStatus === LogEntryStatus.GENERATED) counters.generated--;
    else if (oldStatus === LogEntryStatus.SCHEDULED) counters.scheduled--;
    else if (oldStatus === LogEntryStatus.FAILED) counters.failed--;

    if (newStatus === LogEntryStatus.GENERATED) counters.generated++;
    else if (newStatus === LogEntryStatus.SCHEDULED) counters.scheduled++;
    else if (newStatus === LogEntryStatus.FAILED) counters.failed++;

    if (counters.generated !== 0 || counters.scheduled !== 0 || counters.failed !== 0) {
      await this.automationLogRepository.incrementLogCounters(logId, counters);
    }
  }

  private async calculateLogsSummary(logs: any[]): Promise<{
    totalWeeks: number;
    successfulWeeks: number;
    failedWeeks: number;
    totalPostsGenerated: number;
    totalPostsScheduled: number;
    totalPostsFailed: number;
    averageSuccessRate: number;
  }> {
    const totalWeeks = logs.length;
    const successfulWeeks = logs.filter(log => log.status === AutomationStatus.COMPLETED).length;
    const failedWeeks = logs.filter(log => log.status === AutomationStatus.FAILED).length;
    const totalPostsGenerated = logs.reduce((sum, log) => sum + log.totalGenerated, 0);
    const totalPostsScheduled = logs.reduce((sum, log) => sum + log.totalScheduled, 0);
    const totalPostsFailed = logs.reduce((sum, log) => sum + log.totalFailed, 0);

    const totalPlanned = logs.reduce((sum, log) => sum + log.totalPlanned, 0);
    const averageSuccessRate = totalPlanned > 0 ? (totalPostsScheduled / totalPlanned) * 100 : 0;

    return {
      totalWeeks,
      successfulWeeks,
      failedWeeks,
      totalPostsGenerated,
      totalPostsScheduled,
      totalPostsFailed,
      averageSuccessRate,
    };
  }

  private mapLogToResponseDto(log: AutomationLog): AutomationLogResponseDto {
    return {
      id: log.id,
      contentPlanId: log.contentPlanId,
      weekStartDate: log.weekStartDate,
      status: log.status as AutomationStatus,
      totalPlanned: log.totalPlanned,
      totalGenerated: log.totalGenerated,
      totalScheduled: log.totalScheduled,
      totalFailed: log.totalFailed,
      errorDetails: log.errorDetails,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
      logEntries: [],
    };
  }

  private mapLogWithEntriesToResponseDto(log: any): AutomationLogResponseDto {
    return {
      id: log.id,
      contentPlanId: log.contentPlanId,
      weekStartDate: log.weekStartDate,
      status: log.status as AutomationStatus,
      totalPlanned: log.totalPlanned,
      totalGenerated: log.totalGenerated,
      totalScheduled: log.totalScheduled,
      totalFailed: log.totalFailed,
      errorDetails: log.errorDetails,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
      logEntries: log.logEntries.map((entry: AutomationLogEntry) =>
        this.mapLogEntryToResponseDto(entry)
      ),
    };
  }

  private mapLogEntryToResponseDto(entry: AutomationLogEntry): AutomationLogEntryResponseDto {
    return {
      id: entry.id,
      automationLogId: entry.automationLogId,
      postType: entry.postType,
      platform: entry.platform,
      contentCategory: entry.contentCategory,
      status: entry.status as LogEntryStatus,
      scheduledFor: entry.scheduledFor,
      postId: entry.postId,
      errorMessage: entry.errorMessage,
      createdAt: entry.createdAt,
    };
  }
}