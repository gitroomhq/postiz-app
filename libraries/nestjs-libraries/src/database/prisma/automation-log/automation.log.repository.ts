import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '../prisma.service';
import { AutomationLog, AutomationLogEntry } from '@prisma/client';
import { AutomationStatus, LogEntryStatus } from '../../../dtos/content-automation/interfaces';

export interface CreateAutomationLogData {
  contentPlanId: string;
  weekStartDate: Date;
  status: AutomationStatus;
  totalPlanned: number;
  totalGenerated?: number;
  totalScheduled?: number;
  totalFailed?: number;
  errorDetails?: any;
}

export interface UpdateAutomationLogData {
  status?: AutomationStatus;
  totalGenerated?: number;
  totalScheduled?: number;
  totalFailed?: number;
  errorDetails?: any;
}

export interface CreateAutomationLogEntryData {
  automationLogId: string;
  postType: string;
  platform: string;
  contentCategory: string;
  status: LogEntryStatus;
  scheduledFor?: Date;
  postId?: string;
  errorMessage?: string;
}

export interface UpdateAutomationLogEntryData {
  status?: LogEntryStatus;
  scheduledFor?: Date;
  postId?: string;
  errorMessage?: string;
}

export interface AutomationLogFilters {
  contentPlanId?: string;
  status?: AutomationStatus[];
  platforms?: string[];
  contentCategories?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  weekStartDate?: Date;
}

export interface AutomationLogWithEntries extends AutomationLog {
  logEntries: AutomationLogEntry[];
}

@Injectable()
export class AutomationLogRepository {
  constructor(
    private _automationLog: PrismaRepository<'automationLog'>,
    private _automationLogEntry: PrismaRepository<'automationLogEntry'>,
  ) { }

  // AutomationLog CRUD operations
  async createLog(data: CreateAutomationLogData): Promise<AutomationLog> {
    return this._automationLog.model.automationLog.create({
      data: {
        contentPlanId: data.contentPlanId,
        weekStartDate: data.weekStartDate,
        status: data.status,
        totalPlanned: data.totalPlanned,
        totalGenerated: data.totalGenerated || 0,
        totalScheduled: data.totalScheduled || 0,
        totalFailed: data.totalFailed || 0,
        errorDetails: data.errorDetails,
      },
    });
  }

  async updateLog(id: string, data: UpdateAutomationLogData): Promise<AutomationLog> {
    return this._automationLog.model.automationLog.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.totalGenerated !== undefined && { totalGenerated: data.totalGenerated }),
        ...(data.totalScheduled !== undefined && { totalScheduled: data.totalScheduled }),
        ...(data.totalFailed !== undefined && { totalFailed: data.totalFailed }),
        ...(data.errorDetails !== undefined && { errorDetails: data.errorDetails }),
        updatedAt: new Date(),
      },
    });
  }

  async getLogById(id: string): Promise<AutomationLog | null> {
    return this._automationLog.model.automationLog.findUnique({
      where: { id },
    });
  }

  async getLogWithEntries(id: string): Promise<AutomationLogWithEntries | null> {
    return this._automationLog.model.automationLog.findUnique({
      where: { id },
      include: {
        logEntries: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
  }

  async getLogsByContentPlan(contentPlanId: string): Promise<AutomationLog[]> {
    return this._automationLog.model.automationLog.findMany({
      where: {
        contentPlanId,
      },
      orderBy: {
        weekStartDate: 'desc',
      },
    });
  }

  async getLogsByContentPlanWithEntries(contentPlanId: string): Promise<AutomationLogWithEntries[]> {
    return this._automationLog.model.automationLog.findMany({
      where: {
        contentPlanId,
      },
      include: {
        logEntries: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        weekStartDate: 'desc',
      },
    });
  }

  async getLogsByWeekRange(contentPlanId: string, startDate: Date, endDate: Date): Promise<AutomationLog[]> {
    return this._automationLog.model.automationLog.findMany({
      where: {
        contentPlanId,
        weekStartDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        weekStartDate: 'asc',
      },
    });
  }

  async getLogByWeekStart(contentPlanId: string, weekStartDate: Date): Promise<AutomationLog | null> {
    return this._automationLog.model.automationLog.findFirst({
      where: {
        contentPlanId,
        weekStartDate,
      },
    });
  }

  async getActiveLogsByStatus(status: AutomationStatus[]): Promise<AutomationLog[]> {
    return this._automationLog.model.automationLog.findMany({
      where: {
        status: {
          in: status,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async getLogsWithFilters(filters: AutomationLogFilters, limit?: number, offset?: number): Promise<AutomationLogWithEntries[]> {
    const where: any = {};

    if (filters.contentPlanId) {
      where.contentPlanId = filters.contentPlanId;
    }

    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status };
    }

    if (filters.weekStartDate) {
      where.weekStartDate = filters.weekStartDate;
    }

    if (filters.dateRange) {
      where.weekStartDate = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end,
      };
    }

    // Platform and category filters need to be applied through logEntries
    if (filters.platforms && filters.platforms.length > 0) {
      where.logEntries = {
        some: {
          platform: { in: filters.platforms },
        },
      };
    }

    if (filters.contentCategories && filters.contentCategories.length > 0) {
      where.logEntries = {
        ...where.logEntries,
        some: {
          ...where.logEntries?.some,
          contentCategory: { in: filters.contentCategories },
        },
      };
    }

    return this._automationLog.model.automationLog.findMany({
      where,
      include: {
        logEntries: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        weekStartDate: 'desc',
      },
      ...(limit && { take: limit }),
      ...(offset && { skip: offset }),
    });
  }

  async countLogsWithFilters(filters: AutomationLogFilters): Promise<number> {
    const where: any = {};

    if (filters.contentPlanId) {
      where.contentPlanId = filters.contentPlanId;
    }

    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status };
    }

    if (filters.weekStartDate) {
      where.weekStartDate = filters.weekStartDate;
    }

    if (filters.dateRange) {
      where.weekStartDate = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end,
      };
    }

    if (filters.platforms && filters.platforms.length > 0) {
      where.logEntries = {
        some: {
          platform: { in: filters.platforms },
        },
      };
    }

    if (filters.contentCategories && filters.contentCategories.length > 0) {
      where.logEntries = {
        ...where.logEntries,
        some: {
          ...where.logEntries?.some,
          contentCategory: { in: filters.contentCategories },
        },
      };
    }

    return this._automationLog.model.automationLog.count({
      where,
    });
  }

  async deleteLog(id: string): Promise<AutomationLog> {
    return this._automationLog.model.automationLog.delete({
      where: { id },
    });
  }

  // AutomationLogEntry CRUD operations
  async createLogEntry(data: CreateAutomationLogEntryData): Promise<AutomationLogEntry> {
    return this._automationLogEntry.model.automationLogEntry.create({
      data: {
        automationLogId: data.automationLogId,
        postType: data.postType,
        platform: data.platform,
        contentCategory: data.contentCategory,
        status: data.status,
        scheduledFor: data.scheduledFor,
        postId: data.postId,
        errorMessage: data.errorMessage,
      },
    });
  }

  async createLogEntries(entries: CreateAutomationLogEntryData[]): Promise<number> {
    const result = await this._automationLogEntry.model.automationLogEntry.createMany({
      data: entries.map(entry => ({
        automationLogId: entry.automationLogId,
        postType: entry.postType,
        platform: entry.platform,
        contentCategory: entry.contentCategory,
        status: entry.status,
        scheduledFor: entry.scheduledFor,
        postId: entry.postId,
        errorMessage: entry.errorMessage,
      })),
    });
    return result.count;
  }

  async updateLogEntry(id: string, data: UpdateAutomationLogEntryData): Promise<AutomationLogEntry> {
    return this._automationLogEntry.model.automationLogEntry.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.scheduledFor !== undefined && { scheduledFor: data.scheduledFor }),
        ...(data.postId !== undefined && { postId: data.postId }),
        ...(data.errorMessage !== undefined && { errorMessage: data.errorMessage }),
      },
    });
  }

  async getLogEntryById(id: string): Promise<AutomationLogEntry | null> {
    return this._automationLogEntry.model.automationLogEntry.findUnique({
      where: { id },
    });
  }

  async getLogEntriesByLog(automationLogId: string): Promise<AutomationLogEntry[]> {
    return this._automationLogEntry.model.automationLogEntry.findMany({
      where: {
        automationLogId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async getLogEntriesByStatus(automationLogId: string, status: LogEntryStatus[]): Promise<AutomationLogEntry[]> {
    return this._automationLogEntry.model.automationLogEntry.findMany({
      where: {
        automationLogId,
        status: {
          in: status,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async getPendingLogEntries(): Promise<AutomationLogEntry[]> {
    return this._automationLogEntry.model.automationLogEntry.findMany({
      where: {
        status: LogEntryStatus.PENDING,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async deleteLogEntry(id: string): Promise<AutomationLogEntry> {
    return this._automationLogEntry.model.automationLogEntry.delete({
      where: { id },
    });
  }

  async deleteLogEntriesByLog(automationLogId: string): Promise<number> {
    const result = await this._automationLogEntry.model.automationLogEntry.deleteMany({
      where: {
        automationLogId,
      },
    });
    return result.count;
  }

  // Weekly cycle tracking methods
  async getCurrentWeekLog(contentPlanId: string): Promise<AutomationLog | null> {
    const now = new Date();
    const weekStart = this.getWeekStartDate(now);

    return this.getLogByWeekStart(contentPlanId, weekStart);
  }

  async getOrCreateCurrentWeekLog(contentPlanId: string, totalPlanned: number): Promise<AutomationLog> {
    const existingLog = await this.getCurrentWeekLog(contentPlanId);

    if (existingLog) {
      return existingLog;
    }

    const weekStart = this.getWeekStartDate(new Date());
    return this.createLog({
      contentPlanId,
      weekStartDate: weekStart,
      status: AutomationStatus.PENDING,
      totalPlanned,
    });
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
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - (weekCount * 7));

    const logs = await this.getLogsByWeekRange(contentPlanId, startDate, endDate);

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

  private getWeekStartDate(date: Date): Date {
    const weekStart = new Date(date);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Monday as week start
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  async incrementLogCounters(logId: string, counters: {
    generated?: number;
    scheduled?: number;
    failed?: number;
  }): Promise<AutomationLog> {
    const log = await this.getLogById(logId);
    if (!log) {
      throw new Error('Automation log not found');
    }

    return this.updateLog(logId, {
      totalGenerated: log.totalGenerated + (counters.generated || 0),
      totalScheduled: log.totalScheduled + (counters.scheduled || 0),
      totalFailed: log.totalFailed + (counters.failed || 0),
    });
  }
}