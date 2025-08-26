import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { UsageTrackingRepository } from './usage.tracking.repository';
import {
  TrackApiUsageDto,
  UpdateMonthlyLimitDto,
  PurchaseExtraCreditsDto,
  UsageStatsFiltersDto
} from '@gitroom/nestjs-libraries/dtos/content-automation/request.dtos';
import {
  UsageStatsResponseDto,
  UsageLimitResultResponseDto
} from '@gitroom/nestjs-libraries/dtos/content-automation/response.dtos';
import {
  UsageTrackingData,
  UsageLimitResult,
  UsageStats,
  UsageProjection
} from '@gitroom/nestjs-libraries/dtos/content-automation/interfaces';
import { UsageTracking } from '@prisma/client';

@Injectable()
export class UsageTrackingService {
  private readonly DEFAULT_MONTHLY_LIMIT = 100;
  private readonly WARNING_THRESHOLDS = {
    LOW: 0.5,
    MEDIUM: 0.7,
    HIGH: 0.85,
    CRITICAL: 0.95
  };

  constructor(
    private readonly usageTrackingRepository: UsageTrackingRepository,
  ) { }

  async trackAPIUsage(organizationId: string, data: TrackApiUsageDto): Promise<void> {
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    const limitResult = await this.checkUsageLimit(organizationId);
    if (!limitResult.canProceed && data.calls > limitResult.remainingCalls) {
      throw new ForbiddenException(
        `API usage limit exceeded. Remaining calls: ${limitResult.remainingCalls}, Requested: ${data.calls}`
      );
    }

    await this.usageTrackingRepository.incrementApiUsage(organizationId, month, year, data.calls);
  }

  async checkUsageLimit(organizationId: string): Promise<UsageLimitResult> {
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    const usage = await this.usageTrackingRepository.getCurrentMonthUsage(organizationId, month, year);

    if (!usage) {
      // Create initial usage record with default limit
      await this.usageTrackingRepository.createUsageRecord(
        organizationId,
        month,
        year,
        this.DEFAULT_MONTHLY_LIMIT
      );

      return this.buildUsageLimitResult({
        organizationId,
        month,
        year,
        apiCalls: 0,
        monthlyLimit: this.DEFAULT_MONTHLY_LIMIT,
        extraCredits: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return this.buildUsageLimitResult(usage);
  }

  async resetMonthlyUsage(organizationId: string): Promise<void> {
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    await this.usageTrackingRepository.resetMonthlyUsage(organizationId, month, year);
  }

  async purchaseExtraCredits(organizationId: string, data: PurchaseExtraCreditsDto): Promise<UsageStatsResponseDto> {
    if (data.credits <= 0) {
      throw new BadRequestException('Credits must be a positive number');
    }

    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    await this.usageTrackingRepository.addExtraCredits(organizationId, month, year, data.credits);

    return this.getUsageStats(organizationId, { includeHistory: false });
  }

  async updateMonthlyLimit(organizationId: string, data: UpdateMonthlyLimitDto): Promise<UsageStatsResponseDto> {
    if (data.monthlyLimit < 0) {
      throw new BadRequestException('Monthly limit cannot be negative');
    }

    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    await this.usageTrackingRepository.updateMonthlyLimit(organizationId, month, year, data.monthlyLimit);

    return this.getUsageStats(organizationId, { includeHistory: false });
  }

  async getUsageStats(organizationId: string, filters: UsageStatsFiltersDto = {}): Promise<UsageStatsResponseDto> {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Get current month usage
    let currentUsage = await this.usageTrackingRepository.getCurrentMonthUsage(organizationId, currentMonth, currentYear);

    if (!currentUsage) {
      currentUsage = await this.usageTrackingRepository.createUsageRecord(
        organizationId,
        currentMonth,
        currentYear,
        this.DEFAULT_MONTHLY_LIMIT
      );
    }

    const remainingCalls = Math.max(0, (currentUsage.monthlyLimit + currentUsage.extraCredits) - currentUsage.apiCalls);
    const usagePercentage = currentUsage.monthlyLimit > 0
      ? (currentUsage.apiCalls / (currentUsage.monthlyLimit + currentUsage.extraCredits)) * 100
      : 0;

    const response: UsageStatsResponseDto = {
      organizationId,
      currentMonth: {
        month: currentUsage.month,
        year: currentUsage.year,
        apiCalls: currentUsage.apiCalls,
        monthlyLimit: currentUsage.monthlyLimit,
        extraCredits: currentUsage.extraCredits,
        remainingCalls,
        usagePercentage: Math.min(100, usagePercentage),
      },
      history: [],
    };

    // Get historical data if requested
    if (filters.includeHistory !== false) {
      const months = filters.months || 6;
      const history = await this.usageTrackingRepository.getUsageHistory(organizationId, months);

      response.history = history
        .filter(h => !(h.month === currentMonth && h.year === currentYear)) // Exclude current month
        .map(h => ({
          month: h.month,
          year: h.year,
          apiCalls: h.apiCalls,
          monthlyLimit: h.monthlyLimit,
          extraCredits: h.extraCredits,
        }));
    }

    // Add projections if requested
    if (filters.includeProjections) {
      response.projectedUsage = this.calculateUsageProjection(currentUsage, currentDate);
    }

    return response;
  }

  async getUsageLimitResult(organizationId: string): Promise<UsageLimitResultResponseDto> {
    const limitResult = await this.checkUsageLimit(organizationId);

    return {
      canProceed: limitResult.canProceed,
      remainingCalls: limitResult.remainingCalls,
      monthlyLimit: limitResult.monthlyLimit,
      extraCredits: limitResult.extraCredits,
      usagePercentage: limitResult.usagePercentage,
      resetDate: limitResult.resetDate,
      warningLevel: limitResult.warningLevel,
      message: limitResult.message,
      upgradeOptions: this.getUpgradeOptions(limitResult.remainingCalls),
    };
  }

  async bulkResetMonthlyUsage(organizationIds: string[]): Promise<number> {
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    return this.usageTrackingRepository.bulkResetMonthlyUsage(organizationIds, month, year);
  }

  async getOrganizationsExceedingLimit(): Promise<{ organizationId: string; month: number; year: number; apiCalls: number; limit: number }[]> {
    return this.usageTrackingRepository.getOrganizationsExceedingLimit();
  }

  async getTotalUsageForOrganization(organizationId: string): Promise<{ totalApiCalls: number; totalExtraCredits: number }> {
    return this.usageTrackingRepository.getTotalUsageForOrganization(organizationId);
  }

  private buildUsageLimitResult(usage: UsageTrackingData): UsageLimitResult {
    const totalLimit = usage.monthlyLimit + usage.extraCredits;
    const remainingCalls = Math.max(0, totalLimit - usage.apiCalls);
    const usagePercentage = totalLimit > 0 ? (usage.apiCalls / totalLimit) : 0;
    const canProceed = remainingCalls > 0;

    // Calculate reset date (first day of next month)
    const resetDate = new Date(usage.year, usage.month, 1); // This gives us the first day of next month

    // Determine warning level
    let warningLevel: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';
    let message = `You have ${remainingCalls} API calls remaining this month.`;

    if (usagePercentage >= this.WARNING_THRESHOLDS.CRITICAL) {
      warningLevel = 'critical';
      message = `Critical: Only ${remainingCalls} API calls remaining. Consider purchasing additional credits.`;
    } else if (usagePercentage >= this.WARNING_THRESHOLDS.HIGH) {
      warningLevel = 'high';
      message = `Warning: You've used ${Math.round(usagePercentage * 100)}% of your monthly limit.`;
    } else if (usagePercentage >= this.WARNING_THRESHOLDS.MEDIUM) {
      warningLevel = 'medium';
      message = `Notice: You've used ${Math.round(usagePercentage * 100)}% of your monthly limit.`;
    } else if (usagePercentage >= this.WARNING_THRESHOLDS.LOW) {
      warningLevel = 'low';
      message = `You've used ${Math.round(usagePercentage * 100)}% of your monthly limit.`;
    }

    if (!canProceed) {
      message = 'Monthly API limit exceeded. Please purchase additional credits or wait for the monthly reset.';
    }

    return {
      canProceed,
      remainingCalls,
      monthlyLimit: usage.monthlyLimit,
      extraCredits: usage.extraCredits,
      usagePercentage: Math.min(100, usagePercentage * 100),
      resetDate,
      warningLevel,
      message,
    };
  }

  private calculateUsageProjection(usage: UsageTrackingData, currentDate: Date): UsageProjection {
    const dayOfMonth = currentDate.getDate();
    const daysInMonth = new Date(usage.year, usage.month, 0).getDate();
    const daysElapsed = dayOfMonth;
    const daysRemaining = daysInMonth - dayOfMonth;

    if (daysElapsed === 0) {
      return {
        estimatedMonthlyUsage: 0,
        daysUntilLimit: daysInMonth,
        recommendedAction: 'Continue monitoring usage',
        confidence: 0,
      };
    }

    const dailyAverage = usage.apiCalls / daysElapsed;
    const estimatedMonthlyUsage = Math.round(dailyAverage * daysInMonth);
    const totalLimit = usage.monthlyLimit + usage.extraCredits;

    let daysUntilLimit = daysInMonth;
    if (dailyAverage > 0) {
      const remainingCalls = totalLimit - usage.apiCalls;
      daysUntilLimit = Math.max(0, Math.floor(remainingCalls / dailyAverage));
    }

    let recommendedAction = 'Continue monitoring usage';
    if (estimatedMonthlyUsage > totalLimit * 0.9) {
      recommendedAction = 'Consider purchasing additional credits';
    } else if (estimatedMonthlyUsage > totalLimit) {
      recommendedAction = 'Purchase additional credits to avoid service interruption';
    }

    // Confidence decreases early in the month
    const confidence = Math.min(1, daysElapsed / 7); // Full confidence after a week

    return {
      estimatedMonthlyUsage,
      daysUntilLimit,
      recommendedAction,
      confidence,
    };
  }

  private getUpgradeOptions(remainingCalls: number): { additionalCredits: number; price: number; currency: string }[] {
    // This would typically come from a configuration or pricing service
    const baseOptions = [
      { additionalCredits: 100, price: 10, currency: 'USD' },
      { additionalCredits: 500, price: 40, currency: 'USD' },
      { additionalCredits: 1000, price: 75, currency: 'USD' },
    ];

    // Filter options based on remaining calls to show relevant upgrades
    if (remainingCalls < 50) {
      return baseOptions;
    } else if (remainingCalls < 200) {
      return baseOptions.slice(1); // Skip the smallest option
    } else {
      return baseOptions.slice(2); // Only show larger options
    }
  }
}