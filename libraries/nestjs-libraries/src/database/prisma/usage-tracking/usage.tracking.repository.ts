import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '../prisma.service';
import { UsageTracking } from '@prisma/client';

@Injectable()
export class UsageTrackingRepository {
  constructor(
    private _usageTracking: PrismaRepository<'usageTracking'>,
  ) { }

  async createUsageRecord(organizationId: string, month: number, year: number, monthlyLimit: number): Promise<UsageTracking> {
    return this._usageTracking.model.usageTracking.create({
      data: {
        organizationId,
        month,
        year,
        apiCalls: 0,
        monthlyLimit,
        extraCredits: 0,
      },
    });
  }

  async getCurrentMonthUsage(organizationId: string, month: number, year: number): Promise<UsageTracking | null> {
    return this._usageTracking.model.usageTracking.findUnique({
      where: {
        organizationId_month_year: {
          organizationId,
          month,
          year,
        },
      },
    });
  }

  async incrementApiUsage(organizationId: string, month: number, year: number, calls: number): Promise<UsageTracking> {
    return this._usageTracking.model.usageTracking.upsert({
      where: {
        organizationId_month_year: {
          organizationId,
          month,
          year,
        },
      },
      update: {
        apiCalls: {
          increment: calls,
        },
        updatedAt: new Date(),
      },
      create: {
        organizationId,
        month,
        year,
        apiCalls: calls,
        monthlyLimit: 100, // Default limit
        extraCredits: 0,
      },
    });
  }

  async updateMonthlyLimit(organizationId: string, month: number, year: number, newLimit: number): Promise<UsageTracking> {
    return this._usageTracking.model.usageTracking.upsert({
      where: {
        organizationId_month_year: {
          organizationId,
          month,
          year,
        },
      },
      update: {
        monthlyLimit: newLimit,
        updatedAt: new Date(),
      },
      create: {
        organizationId,
        month,
        year,
        apiCalls: 0,
        monthlyLimit: newLimit,
        extraCredits: 0,
      },
    });
  }

  async addExtraCredits(organizationId: string, month: number, year: number, credits: number): Promise<UsageTracking> {
    return this._usageTracking.model.usageTracking.upsert({
      where: {
        organizationId_month_year: {
          organizationId,
          month,
          year,
        },
      },
      update: {
        extraCredits: {
          increment: credits,
        },
        updatedAt: new Date(),
      },
      create: {
        organizationId,
        month,
        year,
        apiCalls: 0,
        monthlyLimit: 100, // Default limit
        extraCredits: credits,
      },
    });
  }

  async resetMonthlyUsage(organizationId: string, month: number, year: number): Promise<UsageTracking> {
    return this._usageTracking.model.usageTracking.upsert({
      where: {
        organizationId_month_year: {
          organizationId,
          month,
          year,
        },
      },
      update: {
        apiCalls: 0,
        extraCredits: 0,
        updatedAt: new Date(),
      },
      create: {
        organizationId,
        month,
        year,
        apiCalls: 0,
        monthlyLimit: 100, // Default limit
        extraCredits: 0,
      },
    });
  }

  async getUsageHistory(organizationId: string, months: number = 12): Promise<UsageTracking[]> {
    const currentDate = new Date();
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - months + 1, 1);

    return this._usageTracking.model.usageTracking.findMany({
      where: {
        organizationId,
        OR: [
          {
            year: {
              gt: startDate.getFullYear(),
            },
          },
          {
            year: startDate.getFullYear(),
            month: {
              gte: startDate.getMonth() + 1,
            },
          },
        ],
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
      ],
    });
  }

  async getAllUsageForOrganization(organizationId: string): Promise<UsageTracking[]> {
    return this._usageTracking.model.usageTracking.findMany({
      where: {
        organizationId,
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
      ],
    });
  }

  async deleteUsageRecord(organizationId: string, month: number, year: number): Promise<UsageTracking> {
    return this._usageTracking.model.usageTracking.delete({
      where: {
        organizationId_month_year: {
          organizationId,
          month,
          year,
        },
      },
    });
  }

  async getTotalUsageForOrganization(organizationId: string): Promise<{ totalApiCalls: number; totalExtraCredits: number }> {
    const result = await this._usageTracking.model.usageTracking.aggregate({
      where: {
        organizationId,
      },
      _sum: {
        apiCalls: true,
        extraCredits: true,
      },
    });

    return {
      totalApiCalls: result._sum.apiCalls || 0,
      totalExtraCredits: result._sum.extraCredits || 0,
    };
  }

  async getOrganizationsExceedingLimit(): Promise<{ organizationId: string; month: number; year: number; apiCalls: number; limit: number }[]> {
    const records = await this._usageTracking.model.usageTracking.findMany({
      where: {
        apiCalls: {
          gt: this._usageTracking.model.usageTracking.fields.monthlyLimit,
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

    return records.map(record => ({
      organizationId: record.organizationId,
      month: record.month,
      year: record.year,
      apiCalls: record.apiCalls,
      limit: record.monthlyLimit,
    }));
  }

  async bulkResetMonthlyUsage(organizationIds: string[], month: number, year: number): Promise<number> {
    const result = await this._usageTracking.model.usageTracking.updateMany({
      where: {
        organizationId: {
          in: organizationIds,
        },
        month,
        year,
      },
      data: {
        apiCalls: 0,
        extraCredits: 0,
        updatedAt: new Date(),
      },
    });

    return result.count;
  }
}