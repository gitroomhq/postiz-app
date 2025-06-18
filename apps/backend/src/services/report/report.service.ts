import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { subDays, format } from 'date-fns';

@Injectable()
export class ReportService {
  constructor(
    private _instagramInsightsRepository: PrismaRepository<'instagramInsight'>,
  ) { }

  async getInstagramCommunityReport(businessId: string, days: string) {
    return await this.buildCommunityReport(businessId, days);
  }

  async getInstagramOverviewReport(businessId: string, days: string) {
    return await this.buildOverviewReport(businessId, days);
  }

  private async buildCommunityReport(businessId: string, days: string) {

    const range = parseInt(days || '30', 10);
    const today = new Date();
    const startDate = subDays(today, range);

    const insights = await this._instagramInsightsRepository.model.instagramInsight.findMany({
      where: {
        businessId,
        createdAt: {
          gte: startDate,
          lte: today,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // 1. Monthly Table Group
    const monthGroups = new Map<string, any>();
    for (const record of insights) {
      const month = format(record.createdAt, 'yyyy-MM');
      if (!monthGroups.has(month)) {
        monthGroups.set(month, record);
      }
    }

    const stats = [...monthGroups.entries()].map(([month, data]) => ({
      month,
      followers: data.followers || 0,
      following: data.following || 0,
      totalContent: data.totalContent || 0,
    }));

    const followers = stats.map((s) => s.followers.toString());
    const following = stats.map((s) => s.following.toString());
    const totalContent = stats.map((s) => s.totalContent.toString());

    const lastMonth = stats[stats.length - 1];
    const prevMonth = stats[stats.length - 2];

    const changeFollowers = this.getPercentageChange(prevMonth?.followers, lastMonth?.followers);
    const growthCount = lastMonth?.followers - prevMonth?.followers || 0;

    // 2. Chart Data Preparation (Daily)
    const chartData = insights.map((i) => ({
      date: format(i.createdAt, 'yyyy-MM-dd'),
      followers: i.followers,
      following: i.following,
      totalContent: i.totalContent,
    }));

    return {
      table: {
        Data: [...stats.map((s) => format(new Date(`${s.month}-01`), 'MMMM')), 'Change %'],
        Followers: [...followers, `${changeFollowers.toFixed(2)}%`],
        Following: [...following, '0%'],
        TotalContent: [...totalContent, '0%'],
        Growth: `+${growthCount} New Followers`,
      },
      chart: chartData,
    };
  }

  private async buildOverviewReport(businessId: string, days: string) {
    const range = parseInt(days || '30', 10);
    const today = new Date();
    const startDate = subDays(today, range);

    const insights = await this._instagramInsightsRepository.model.instagramInsight.findMany({
      where: {
        businessId,
        createdAt: {
          gte: startDate,
          lte: today,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!insights.length) {
      return {
        Data: [],
        Impressions: [],
        AvgReachPerDay: [],
        TotalContent: [],
        dailyStats: [], // for chart
      };
    }

    // 📊 Daily stats for chart
    const dailyStats = insights.map((entry) => ({
      date: format(entry.createdAt, 'yyyy-MM-dd'),
      impressions: entry.impressions,
      avgReachPerDay: entry.avgReachPerDay,
      totalContent: entry.totalContent,
    }));

    // 📆 Group by month
    const monthGroups = new Map<string, { impressions: number[]; reach: number[]; content: number[] }>();

    for (const record of insights) {
      const month = format(record.createdAt, 'yyyy-MM');
      if (!monthGroups.has(month)) {
        monthGroups.set(month, { impressions: [], reach: [], content: [] });
      }

      const group = monthGroups.get(month);
      group.impressions.push(record.impressions);
      group.reach.push(record.avgReachPerDay);
      group.content.push(record.totalContent);
    }

    const monthStats = [...monthGroups.entries()].map(([month, values]) => ({
      month,
      impressions: values.impressions.reduce((a, b) => a + b, 0),
      avgReachPerDay: Math.round(values.reach.reduce((a, b) => a + b, 0) / values.reach.length),
      totalContent: Math.max(...values.content),
    }));

    const lastMonth = monthStats[monthStats.length - 1];
    const prevMonth = monthStats[monthStats.length - 2];

    const changeImpressions = this.getPercentageChange(prevMonth?.impressions, lastMonth?.impressions);
    const changeReach = this.getPercentageChange(prevMonth?.avgReachPerDay, lastMonth?.avgReachPerDay);

    return {
      table: {
        Data: [...monthStats.map((m) => format(new Date(`${m.month}-01`), 'MMMM')), 'Change %'],
        Impressions: [...monthStats.map((m) => this.kFormatter(m.impressions)), `${changeImpressions.toFixed(2)}%`],
        AvgReachPerDay: [...monthStats.map((m) => m.avgReachPerDay.toString()), `${changeReach.toFixed(2)}%`],
        TotalContent: [...monthStats.map((m) => m.totalContent.toString()), '0%'],
      },
      chart: dailyStats,
    };
  }

  private getPercentageChange(previous: number, current: number): number {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }

  private kFormatter(num: number): string {
    return num >= 1000 ? `${(num / 1000).toFixed(2)}k` : num.toString();
  }


  ////////////////////////////////////////////////////////////////////////////////

  async instagramInsightList(businessId: string) {
    return this._instagramInsightsRepository.model.instagramInsight.findMany({
      where: {
        businessId
      },
    });
  }


  async deleteInstagramInsight(id: string) {
    return this._instagramInsightsRepository.model.instagramInsight.delete({
      where: {
        id: id
      }
    });
  }

  ////////////////////////////////////////////////////////////////////////////////
}
