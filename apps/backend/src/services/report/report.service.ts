import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { subDays, format } from 'date-fns';
import { parse, getMonth } from 'date-fns';
import { parseISO, compareAsc } from 'date-fns';

@Injectable()
export class ReportService {
  constructor(
    private _instagramInsightsRepository: PrismaRepository<'instagramInsight'>,
    private _xInsightsRepository: PrismaRepository<'xInsight'>,
    private _youtubeInsightsRepository: PrismaRepository<'youTubeInsight'>,
    private _facebookInsightsRepository: PrismaRepository<'facebookInsight'>,
    private _linkedInInsightsRepository: PrismaRepository<'linkedInInsight'>,
    private _gbpInsightsRepository: PrismaRepository<'gbpInsight'>,
    private _websitePerformanceRepo: PrismaRepository<'websitePerformance'>,
    private _websiteLocationRepo: PrismaRepository<'websiteLocation'>,
    private _pinterestPostPerformanceRepo: PrismaRepository<'pinterestPostPerformance'>,
    private _threadsInsightRepo: PrismaRepository<'threadsInsight'>,
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

  async getXCommunityReport(businessId: string, days: string) {
    return await this.buildXCommunityReport(businessId, days);
  }

  private async buildXCommunityReport(businessId: string, days: string) {
    const range = parseInt(days || '30', 10);
    const today = new Date();
    const startDate = subDays(today, range);

    const insights = await this._xInsightsRepository.model.xInsight.findMany({
      where: {
        businessId,
        createdAt: { gte: startDate, lte: today },
      },
      orderBy: { createdAt: 'asc' },
    });

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

  async getXOverviewReport(businessId: string, days: string) {
    return await this.buildXOverviewReport(businessId, days);
  }

  private async buildXOverviewReport(businessId: string, days: string) {
    const range = parseInt(days || '30', 10);
    const today = new Date();
    const startDate = subDays(today, range);

    const insights = await this._xInsightsRepository.model.xInsight.findMany({
      where: {
        businessId,
        createdAt: { gte: startDate, lte: today },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!insights.length) return {
      Data: [],
      Impressions: [],
      Engagement: [],
      Interactions: [],
      TotalContent: [],
      dailyStats: [],
    };

    const dailyStats = insights.map((entry) => ({
      date: format(entry.createdAt, 'yyyy-MM-dd'),
      impressions: entry.impressions,
      engagement: entry.engagement,
      interactions: entry.interactions,
      totalContent: entry.totalContent,
    }));

    const monthGroups = new Map<string, { impressions: number[]; engagement: number[]; interactions: number[]; content: number[] }>();
    for (const record of insights) {
      const month = format(record.createdAt, 'yyyy-MM');
      if (!monthGroups.has(month)) {
        monthGroups.set(month, { impressions: [], engagement: [], interactions: [], content: [] });
      }

      const group = monthGroups.get(month);
      group.impressions.push(record.impressions);
      group.engagement.push(record.engagement);
      group.interactions.push(record.interactions);
      group.content.push(record.totalContent);
    }

    const monthStats = [...monthGroups.entries()].map(([month, values]) => ({
      month,
      impressions: values.impressions.reduce((a, b) => a + b, 0),
      engagement: +(values.engagement.reduce((a, b) => a + b, 0) / values.engagement.length).toFixed(2),
      interactions: values.interactions.reduce((a, b) => a + b, 0),
      totalContent: Math.max(...values.content),
    }));

    const lastMonth = monthStats[monthStats.length - 1];
    const prevMonth = monthStats[monthStats.length - 2];

    const changeEngagement = this.getPercentageChange(prevMonth?.engagement, lastMonth?.engagement);
    const changeImpressions = this.getPercentageChange(prevMonth?.impressions, lastMonth?.impressions);
    const changeInteractions = this.getPercentageChange(prevMonth?.interactions, lastMonth?.interactions);

    return {
      table: {
        Data: [...monthStats.map((m) => format(new Date(`${m.month}-01`), 'MMMM')), 'Change %'],
        Engagement: [...monthStats.map((m) => m.engagement.toString()), `${changeEngagement.toFixed(2)}%`],
        Impressions: [...monthStats.map((m) => m.impressions.toString()), `${changeImpressions.toFixed(2)}%`],
        Interactions: [...monthStats.map((m) => m.interactions.toString()), `${changeInteractions.toFixed(2)}%`],
        TotalContent: [...monthStats.map((m) => m.totalContent.toString()), '0%'],
      },
      chart: dailyStats,
    };
  }


  ////////////////////////////////////////////////////////////////////////////////

  async instagramInsightList(businessId: string) {
    return this._xInsightsRepository.model.xInsight.findMany({
      where: {
        businessId
      },
    });
  }

  async xList(businessId: string) {
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

  ///////////////////////////////////////////////////////////////////////////////
  // youtube

  async getYoutubeOverviewReport(businessId: string, days: string) {
    const range = parseInt(days || '30', 10);
    const today = new Date();
    const startDate = subDays(today, range);

    const insights = await this._youtubeInsightsRepository.model.youTubeInsight.findMany({
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
      select: {
        createdAt: true,
        month: true,
        subscribers: true,
        totalViews: true,
        totalVideos: true,
        totalLikes: true,
        totalComments: true,
      },
    });

    if (!insights.length) {
      return {
        table: {
          Data: [],
          Subscribers: [],
          TotalViews: [],
          TotalVideos: [],
          Likes: [],
          Comments: [],
        },
        chart: [],
      };
    }

    // Prepare daily data for charts
    const dailyStats = insights.map((entry) => ({
      date: format(entry.createdAt, 'yyyy-MM-dd'),
      subscribers: entry.subscribers || 0,
      totalViews: entry.totalViews || 0,
      totalVideos: entry.totalVideos || 0,
      likes: entry.totalLikes || 0,
      comments: entry.totalComments || 0,
    }));

    // Group by month for table data
    const monthGroups = new Map<string, {
      subscribers: number[];
      views: number[];
      videos: number[];
      likes: number[];
      comments: number[];
    }>();

    for (const record of insights) {
      const monthKey = record.month || format(record.createdAt, 'yyyy-MM');
      if (!monthGroups.has(monthKey)) {
        monthGroups.set(monthKey, {
          subscribers: [],
          views: [],
          videos: [],
          likes: [],
          comments: [],
        });
      }

      const group = monthGroups.get(monthKey);
      group.subscribers.push(record.subscribers || 0);
      group.views.push(record.totalViews || 0);
      group.videos.push(record.totalVideos || 0);
      group.likes.push(record.totalLikes || 0);
      group.comments.push(record.totalComments || 0);
    }

    // Calculate monthly stats
    const monthStats = [...monthGroups.entries()].map(([month, values]) => ({
      month,
      subscribers: Math.round(values.subscribers.reduce((a, b) => a + b, 0) / values.subscribers.length),
      totalViews: values.views[values.views.length - 1], // Use last value for views
      totalVideos: values.videos[values.videos.length - 1], // Use last value for videos
      totalLikes: values.likes.reduce((a, b) => a + b, 0), // Sum of likes
      totalComments: values.comments.reduce((a, b) => a + b, 0), // Sum of comments
    }));

    // Calculate percentage changes
    const lastMonth = monthStats[monthStats.length - 1];
    const prevMonth = monthStats[monthStats.length - 2];

    const changeSubscribers = this.getPercentageChange(prevMonth?.subscribers, lastMonth?.subscribers);
    const changeViews = this.getPercentageChange(prevMonth?.totalViews, lastMonth?.totalViews);
    const changeVideos = this.getPercentageChange(prevMonth?.totalVideos, lastMonth?.totalVideos);
    const changeLikes = this.getPercentageChange(prevMonth?.totalLikes, lastMonth?.totalLikes);
    const changeComments = this.getPercentageChange(prevMonth?.totalComments, lastMonth?.totalComments);

    return {
      table: {
        Data: [...monthStats.map((m) => format(new Date(`${m.month}-01`), 'MMMM')), 'Change %'],
        Subscribers: [...monthStats.map((m) => this.kFormatter(m.subscribers)), `${changeSubscribers.toFixed(2)}%`],
        TotalViews: [...monthStats.map((m) => this.kFormatter(m.totalViews)), `${changeViews.toFixed(2)}%`],
        TotalVideos: [...monthStats.map((m) => m.totalVideos.toString()), `${changeVideos.toFixed(2)}%`],
        Likes: [...monthStats.map((m) => this.kFormatter(m.totalLikes)), `${changeLikes.toFixed(2)}%`],
        Comments: [...monthStats.map((m) => this.kFormatter(m.totalComments)), `${changeComments.toFixed(2)}%`],
      },
      chart: dailyStats,
    };
  }

  async getYoutubeCommunityReport(businessId: string, days: string) {
    const range = parseInt(days || '30', 10);
    const today = new Date();
    const startDate = subDays(today, range);

    const insights = await this._youtubeInsightsRepository.model.youTubeInsight.findMany({
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
      select: {
        createdAt: true,
        month: true,
        subscribers: true,
        totalViews: true,
        totalVideos: true,
      },
    });

    if (!insights.length) {
      return {
        table: {
          Data: [],
          Subscribers: [],
          TotalViews: [],
          TotalVideos: [],
        },
        chart: [],
      };
    }

    // Group by month
    const monthGroups = new Map<string, any>();
    for (const record of insights) {
      const monthKey = record.month || format(record.createdAt, 'yyyy-MM');
      if (!monthGroups.has(monthKey)) {
        monthGroups.set(monthKey, record);
      }
    }

    const stats = [...monthGroups.entries()].map(([month, data]) => ({
      month,
      subscribers: data.subscribers || 0,
      totalViews: data.totalViews || 0,
      totalVideos: data.totalVideos || 0,
    }));

    const subscribers = stats.map((s) => this.kFormatter(s.subscribers));
    const totalViews = stats.map((s) => this.kFormatter(s.totalViews));
    const totalVideos = stats.map((s) => s.totalVideos.toString());

    const lastMonth = stats[stats.length - 1];
    const prevMonth = stats[stats.length - 2];

    const changeSubscribers = this.getPercentageChange(prevMonth?.subscribers, lastMonth?.subscribers);
    const changeViews = this.getPercentageChange(prevMonth?.totalViews, lastMonth?.totalViews);
    const changeVideos = this.getPercentageChange(prevMonth?.totalVideos, lastMonth?.totalVideos);

    const chartData = insights.map((i) => ({
      date: format(i.createdAt, 'yyyy-MM-dd'),
      subscribers: i.subscribers,
      totalViews: i.totalViews,
      totalVideos: i.totalVideos,
    }));

    return {
      table: {
        Data: [...stats.map((s) => format(new Date(`${s.month}-01`), 'MMMM')), 'Change %'],
        Subscribers: [...subscribers, `${changeSubscribers.toFixed(2)}%`],
        TotalViews: [...totalViews, `${changeViews.toFixed(2)}%`],
        TotalVideos: [...totalVideos, `${changeVideos.toFixed(2)}%`],
      },
      chart: chartData,
    };
  }

  async youtubeInsightList(businessId: string) {
    return this._youtubeInsightsRepository.model.youTubeInsight.findMany({
      where: {
        businessId
      },
      select: {
        id: true,
        createdAt: true,
        month: true,
        subscribers: true,
        totalViews: true,
        totalVideos: true,
        totalLikes: true,
        totalComments: true,
        customer: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async deleteYoutubeInsight(id: string) {
    return this._youtubeInsightsRepository.model.youTubeInsight.delete({
      where: {
        id
      },
    });
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////

  // Facebook methods
  async getFacebookOverviewReport(businessId: string, days: string) {
    const range = parseInt(days || '30', 10);
    const today = new Date();
    const startDate = subDays(today, range);

    const insights = await this._facebookInsightsRepository.model.facebookInsight.findMany({
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
        PageViews: [],
        TotalContent: [],
        dailyStats: [],
      };
    }

    // Daily stats for chart
    const dailyStats = insights.map((entry) => ({
      date: format(entry.createdAt, 'yyyy-MM-dd'),
      impressions: entry.impressions,
      pageViews: entry.pageViews,
      totalContent: entry.totalContent,
    }));

    // Group by month
    const monthGroups = new Map<string, {
      impressions: number[];
      pageViews: number[];
      content: number[]
    }>();

    for (const record of insights) {
      const month = format(record.createdAt, 'yyyy-MM');
      if (!monthGroups.has(month)) {
        monthGroups.set(month, { impressions: [], pageViews: [], content: [] });
      }

      const group = monthGroups.get(month);
      group.impressions.push(record.impressions);
      group.pageViews.push(record.pageViews);
      group.content.push(record.totalContent);
    }

    const monthStats = [...monthGroups.entries()].map(([month, values]) => ({
      month,
      impressions: values.impressions.reduce((a, b) => a + b, 0),
      pageViews: values.pageViews.reduce((a, b) => a + b, 0),
      totalContent: Math.max(...values.content),
    }));

    const lastMonth = monthStats[monthStats.length - 1];
    const prevMonth = monthStats[monthStats.length - 2];

    const changeImpressions = this.getPercentageChange(prevMonth?.impressions, lastMonth?.impressions);
    const changePageViews = this.getPercentageChange(prevMonth?.pageViews, lastMonth?.pageViews);

    return {
      table: {
        Data: [...monthStats.map((m) => format(new Date(`${m.month}-01`), 'MMMM')), 'Change %'],
        Impressions: [...monthStats.map((m) => this.kFormatter(m.impressions)), `${changeImpressions.toFixed(2)}%`],
        PageViews: [...monthStats.map((m) => this.kFormatter(m.pageViews)), `${changePageViews.toFixed(2)}%`],
        TotalContent: [...monthStats.map((m) => m.totalContent.toString()), '0%'],
      },
      chart: dailyStats,
    };
  }

  async getFacebookCommunityReport(businessId: string, days: string) {
    const range = parseInt(days || '30', 10);
    const today = new Date();
    const startDate = subDays(today, range);

    const insights = await this._facebookInsightsRepository.model.facebookInsight.findMany({
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

    // Group by month
    const monthGroups = new Map<string, any>();
    for (const record of insights) {
      const month = format(record.createdAt, 'yyyy-MM');
      if (!monthGroups.has(month)) {
        monthGroups.set(month, record);
      }
    }

    const stats = [...monthGroups.entries()].map(([month, data]) => ({
      month,
      likes: data.likes || 0,
      followers: data.followers || 0,
      totalContent: data.totalContent || 0,
    }));

    const likes = stats.map((s) => s.likes.toString());
    const followers = stats.map((s) => s.followers.toString());
    const totalContent = stats.map((s) => s.totalContent.toString());

    const lastMonth = stats[stats.length - 1];
    const prevMonth = stats[stats.length - 2];

    const changeLikes = this.getPercentageChange(prevMonth?.likes, lastMonth?.likes);
    const growthCount = lastMonth?.likes - prevMonth?.likes || 0;

    // Chart data
    const chartData = insights.map((i) => ({
      date: format(i.createdAt, 'yyyy-MM-dd'),
      likes: i.likes,
      followers: i.followers,
      totalContent: i.totalContent,
    }));

    return {
      table: {
        Data: [...stats.map((s) => format(new Date(`${s.month}-01`), 'MMMM')), 'Change %'],
        Likes: [...likes, `${changeLikes.toFixed(2)}%`],
        Followers: [...followers, '0%'],
        TotalContent: [...totalContent, '0%'],
        Growth: `+${growthCount} New Likes`,
      },
      chart: chartData,
    };
  }

  async facebookInsightList(businessId: string) {
    return this._facebookInsightsRepository.model.facebookInsight.findMany({
      where: { businessId },
    });
  }

  async deleteFacebookInsight(id: string) {
    return this._facebookInsightsRepository.model.facebookInsight.delete({
      where: { id }
    });
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////


  ////////////////////////////////////////////////////////////////////////////////////////////////////

  // Add to your report service
  async getLinkedInOverviewReport(businessId: string, days: string) {
    const range = parseInt(days || '30', 10);
    const today = new Date();
    const startDate = subDays(today, range);

    const insights = await this._linkedInInsightsRepository.model.linkedInInsight.findMany({
      where: {
        businessId, // Changed from businessId to businessId
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
        Posts: [],
        dailyStats: [],
      };
    }

    // Daily stats for chart
    const dailyStats = insights.map((entry) => ({
      date: format(entry.createdAt, 'yyyy-MM-dd'),
      impressions: entry.impressions,
      postsCount: entry.postsCount,
    }));

    // Group by month
    const monthGroups = new Map<string, {
      impressions: number[];
      postsCount: number[];
    }>();

    for (const record of insights) {
      const month = format(record.createdAt, 'yyyy-MM');
      if (!monthGroups.has(month)) {
        monthGroups.set(month, { impressions: [], postsCount: [] });
      }

      const group = monthGroups.get(month);
      group.impressions.push(record.impressions);
      group.postsCount.push(record.postsCount);
    }

    const monthStats = [...monthGroups.entries()].map(([month, values]) => ({
      month,
      impressions: values.impressions.reduce((a, b) => a + b, 0),
      postsCount: values.postsCount.reduce((a, b) => a + b, 0),
    }));

    const lastMonth = monthStats[monthStats.length - 1];
    const prevMonth = monthStats[monthStats.length - 2];

    const changeImpressions = this.getPercentageChange(prevMonth?.impressions, lastMonth?.impressions);
    const changePosts = this.getPercentageChange(prevMonth?.postsCount, lastMonth?.postsCount);

    return {
      table: {
        Data: [...monthStats.map((m) => format(new Date(`${m.month}-01`), 'MMMM')), 'Change %'],
        Impressions: [...monthStats.map((m) => this.kFormatter(m.impressions)), `${changeImpressions.toFixed(2)}%`],
        Posts: [...monthStats.map((m) => m.postsCount.toString()), `${changePosts.toFixed(2)}%`],
      },
      chart: dailyStats,
    };
  }

  async getLinkedInCommunityReport(businessId: string, days: string) {
    const range = parseInt(days || '30', 10);
    const today = new Date();
    const startDate = subDays(today, range);

    const insights = await this._linkedInInsightsRepository.model.linkedInInsight.findMany({
      where: {
        businessId, // Changed from businessId to businessId
        createdAt: {
          gte: startDate,
          lte: today,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group by month
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
      paidFollowers: data.paidFollowers || 0,
      postsCount: data.postsCount || 0,
    }));

    const followers = stats.map((s) => s.followers.toString());
    const paidFollowers = stats.map((s) => s.paidFollowers.toString());
    const postsCount = stats.map((s) => s.postsCount.toString());

    const lastMonth = stats[stats.length - 1];
    const prevMonth = stats[stats.length - 2];

    const changeFollowers = this.getPercentageChange(prevMonth?.followers, lastMonth?.followers);
    const growthCount = lastMonth?.followers - prevMonth?.followers || 0;

    // Chart data
    const chartData = insights.map((i) => ({
      date: format(i.createdAt, 'yyyy-MM-dd'),
      followers: i.followers,
      paidFollowers: i.paidFollowers,
      postsCount: i.postsCount,
    }));

    return {
      table: {
        Data: [...stats.map((s) => format(new Date(`${s.month}-01`), 'MMMM')), 'Change %'],
        Followers: [...followers, `${changeFollowers.toFixed(2)}%`],
        'Paid Followers': [...paidFollowers, '0%'],
        Posts: [...postsCount, '0%'],
        Growth: `+${growthCount} New Followers`,
      },
      chart: chartData,
    };
  }

  async linkedInInsightList(businessId: string) {
    return this._linkedInInsightsRepository.model.linkedInInsight.findMany({
      where: { businessId }, // Changed from businessId to businessId
    });
  }

  async deleteLinkedInInsight(id: string) {
    return this._linkedInInsightsRepository.model.linkedInInsight.delete({
      where: { id }
    });
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  async getThreadsGrowthReport(businessId: string, days: string) {
    const range = parseInt(days || '30', 10);
    const today = new Date();
    const startDate = subDays(today, range);

    const insights = await this._threadsInsightRepo.model.threadsInsight.findMany({
      where: { businessId, createdAt: { gte: startDate, lte: today } },
      orderBy: { createdAt: 'asc' },
    });

    if (!insights.length) {
      return {
        table: { Data: [], Followers: [], Posts: [] },
        chart: [],
      };
    }

    const monthGroups = new Map();
    for (const record of insights) {
      const month = format(record.createdAt, 'yyyy-MM');
      if (!monthGroups.has(month)) {
        monthGroups.set(month, record);
      }
    }

    const stats = [...monthGroups.entries()].map(([month, data]) => ({
      month,
      followers: data.followers || 0,
      posts: data.totalContent || 0,
    }));

    const lastMonth = stats[stats.length - 1];
    const prevMonth = stats[stats.length - 2];

    const changeFollowers = this.getPercentageChange(prevMonth?.followers, lastMonth?.followers);
    const changePosts = this.getPercentageChange(prevMonth?.posts, lastMonth?.posts);

    const chart = insights.map((i) => ({
      date: format(i.createdAt, 'yyyy-MM-dd'),
      followers: i.followers,
      posts: i.totalContent,
    }));

    return {
      table: {
        Data: [...stats.map(s => format(new Date(`${s.month}-01`), 'MMMM')), 'Change %'],
        Followers: [...stats.map(s => s.followers.toString()), `${changeFollowers.toFixed(2)}%`],
        Posts: [...stats.map(s => s.posts.toString()), `${changePosts.toFixed(2)}%`],
      },
      chart,
    };
  }


  async getThreadsOverviewReport(businessId: string, days: string) {
    const range = parseInt(days || '30', 10);
    const today = new Date();
    const startDate = subDays(today, range);

    const insights = await this._threadsInsightRepo.model.threadsInsight.findMany({
      where: { businessId, createdAt: { gte: startDate, lte: today } },
      orderBy: { createdAt: 'asc' },
    });

    if (!insights.length) {
      return {
        table: {
          Data: [],
          Engagement: [],
          Interactions: [],
          Impressions: [],
          Posts: [],
        },
        chart: [],
      };
    }

    const monthGroups = new Map();
    for (const record of insights) {
      const month = format(record.createdAt, 'yyyy-MM');
      if (!monthGroups.has(month)) {
        monthGroups.set(month, []);
      }
      monthGroups.get(month).push(record);
    }

    const stats = [...monthGroups.entries()].map(([month, data]) => ({
      month,
      engagement: +(data.reduce((sum, d) => sum + d.engagement, 0) / data.length).toFixed(2),
      interactions: data.reduce((sum, d) => sum + d.interactions, 0),
      impressions: data.reduce((sum, d) => sum + d.impressions, 0),
      posts: Math.max(...data.map(d => d.totalContent)),
    }));

    const lastMonth = stats[stats.length - 1];
    const prevMonth = stats[stats.length - 2];

    const changeEngagement = this.getPercentageChange(prevMonth?.engagement, lastMonth?.engagement);
    const changeInteractions = this.getPercentageChange(prevMonth?.interactions, lastMonth?.interactions);
    const changeImpressions = this.getPercentageChange(prevMonth?.impressions, lastMonth?.impressions);
    const changePosts = this.getPercentageChange(prevMonth?.posts, lastMonth?.posts);

    const chart = insights.map((i) => ({
      date: format(i.createdAt, 'yyyy-MM-dd'),
      engagement: i.engagement,
      interactions: i.interactions,
      impressions: i.impressions,
      posts: i.totalContent,
    }));

    return {
      table: {
        Data: [...stats.map(s => format(new Date(`${s.month}-01`), 'MMMM')), 'Change %'],
        Engagement: [...stats.map(s => s.engagement.toString()), `${changeEngagement.toFixed(2)}%`],
        Interactions: [...stats.map(s => s.interactions.toString()), `${changeInteractions.toFixed(2)}%`],
        Impressions: [...stats.map(s => s.impressions.toString()), `${changeImpressions.toFixed(2)}%`],
        Posts: [...stats.map(s => s.posts.toString()), `${changePosts.toFixed(2)}%`],
      },
      chart,
    };
  }
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // In reports.service.ts
  async getInstagramCommunityReportWithDates(businessId: string, startDate: Date, endDate: Date) {
    const insights = await this._instagramInsightsRepository.model.instagramInsight.findMany({
      where: {
        businessId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Rest of the existing community report logic...
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

  async getInstagramOverviewReportWithDates(businessId: string, startDate: Date, endDate: Date) {
    const insights = await this._instagramInsightsRepository.model.instagramInsight.findMany({
      where: {
        businessId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Rest of the existing overview report logic...

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

  async getGBPPerformanceReport(businessId: string, days: string) {
    return this.buildGBPPerformanceReport(businessId, days);
  }

  async getGBPEngagementReport(businessId: string, days: string) {
    return this.buildGBPEngagementReport(businessId, days);
  }

  async getGBPReviewsReport(businessId: string, days: string) {
    return this.buildGBPReviewsReport(businessId, days);
  }

  private async buildGBPPerformanceReport(businessId: string, days: string) {
    const range = parseInt(days || '30', 10);
    const today = new Date();
    const startDate = subDays(today, range);

    const insights = await this._gbpInsightsRepository.model.gbpInsight.findMany({
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
        'Google maps': [],
        'Google search': [],
        'Total': [],
        dailyStats: [],
      };
    }

    // Group by month
    const monthGroups = new Map<string, {
      maps: number[];
      search: number[];
      total: number[]
    }>();

    for (const record of insights) {
      const month = format(record.createdAt, 'yyyy-MM');
      if (!monthGroups.has(month)) {
        monthGroups.set(month, { maps: [], search: [], total: [] });
      }
      const group = monthGroups.get(month);
      group.maps.push(record.impressionsMaps);
      group.search.push(record.impressionsSearch);
      group.total.push(record.impressionsMaps + record.impressionsSearch);
    }

    const monthStats = [...monthGroups.entries()].map(([month, values]) => ({
      month,
      maps: values.maps.reduce((a, b) => a + b, 0),
      search: values.search.reduce((a, b) => a + b, 0),
      total: values.total.reduce((a, b) => a + b, 0),
    }));

    const lastMonth = monthStats[monthStats.length - 1];
    const prevMonth = monthStats[monthStats.length - 2];

    const changeMaps = this.getPercentageChange(prevMonth?.maps, lastMonth?.maps);
    const changeSearch = this.getPercentageChange(prevMonth?.search, lastMonth?.search);
    const changeTotal = this.getPercentageChange(prevMonth?.total, lastMonth?.total);

    // Daily stats for chart
    const dailyStats = insights.map(entry => ({
      date: format(entry.createdAt, 'yyyy-MM-dd'),
      maps: entry.impressionsMaps,
      search: entry.impressionsSearch,
      total: entry.impressionsMaps + entry.impressionsSearch,
    }));

    return {
      table: {
        Data: [...monthStats.map(m => format(new Date(`${m.month}-01`), 'MMMM')), 'Change %'],
        'Google maps': [...monthStats.map(m => m.maps.toString()), `${changeMaps.toFixed(2)}%`],
        'Google search': [...monthStats.map(m => m.search.toString()), `${changeSearch.toFixed(2)}%`],
        'Total': [...monthStats.map(m => m.total.toString()), `${changeTotal.toFixed(2)}%`],
      },
      chart: dailyStats,
    };
  }

  private async buildGBPEngagementReport(businessId: string, days: string) {
    const range = parseInt(days || '30', 10);
    const today = new Date();
    const startDate = subDays(today, range);

    const insights = await this._gbpInsightsRepository.model.gbpInsight.findMany({
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
        'Website': [],
        'Phone': [],
        'Direction': [],
        'Total': [],
        dailyStats: [],
      };
    }

    // Group by month
    const monthGroups = new Map<string, {
      website: number[];
      phone: number[];
      direction: number[];
      total: number[]
    }>();

    for (const record of insights) {
      const month = format(record.createdAt, 'yyyy-MM');
      if (!monthGroups.has(month)) {
        monthGroups.set(month, { website: [], phone: [], direction: [], total: [] });
      }
      const group = monthGroups.get(month);
      group.website.push(record.websiteClicks);
      group.phone.push(record.phoneClicks);
      group.direction.push(record.directionRequests);
      group.total.push(record.websiteClicks + record.phoneClicks + record.directionRequests);
    }

    const monthStats = [...monthGroups.entries()].map(([month, values]) => ({
      month,
      website: values.website.reduce((a, b) => a + b, 0),
      phone: values.phone.reduce((a, b) => a + b, 0),
      direction: values.direction.reduce((a, b) => a + b, 0),
      total: values.total.reduce((a, b) => a + b, 0),
    }));

    const lastMonth = monthStats[monthStats.length - 1];
    const prevMonth = monthStats[monthStats.length - 2];

    const changeWebsite = this.getPercentageChange(prevMonth?.website, lastMonth?.website);
    const changePhone = this.getPercentageChange(prevMonth?.phone, lastMonth?.phone);
    const changeDirection = this.getPercentageChange(prevMonth?.direction, lastMonth?.direction);
    const changeTotal = this.getPercentageChange(prevMonth?.total, lastMonth?.total);

    // Daily stats for chart
    const dailyStats = insights.map(entry => ({
      date: format(entry.createdAt, 'yyyy-MM-dd'),
      website: entry.websiteClicks,
      phone: entry.phoneClicks,
      direction: entry.directionRequests,
      total: entry.websiteClicks + entry.phoneClicks + entry.directionRequests,
    }));

    return {
      table: {
        Data: [...monthStats.map(m => format(new Date(`${m.month}-01`), 'MMMM')), 'Change %'],
        'Website': [...monthStats.map(m => m.website.toString()), `${changeWebsite.toFixed(2)}%`],
        'Phone': [...monthStats.map(m => m.phone.toString()), `${changePhone.toFixed(2)}%`],
        'Direction': [...monthStats.map(m => m.direction.toString()), `${changeDirection.toFixed(2)}%`],
        'Total': [...monthStats.map(m => m.total.toString()), `${changeTotal.toFixed(2)}%`],
      },
      chart: dailyStats,
    };
  }

  private async buildGBPReviewsReport(businessId: string, days: string) {
    const range = parseInt(days || '30', 10);
    const today = new Date();
    const startDate = subDays(today, range);

    const insights = await this._gbpInsightsRepository.model.gbpInsight.findMany({
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
        'Star Rating': [],
        'Total Review': [],
        dailyStats: [],
      };
    }

    // Group by month
    const monthGroups = new Map<string, {
      rating: number[];
      reviews: number[];
      count: number
    }>();

    for (const record of insights) {
      const month = format(record.createdAt, 'yyyy-MM');
      if (!monthGroups.has(month)) {
        monthGroups.set(month, { rating: [], reviews: [], count: 0 });
      }
      const group = monthGroups.get(month);
      group.rating.push(record.avgRating);
      group.reviews.push(record.totalReviews);
      group.count++;
    }

    const monthStats = [...monthGroups.entries()].map(([month, values]) => ({
      month,
      rating: values.rating.reduce((a, b) => a + b, 0) / values.rating.length,
      reviews: values.reviews.reduce((a, b) => a + b, 0),
    }));

    const lastMonth = monthStats[monthStats.length - 1];
    const prevMonth = monthStats[monthStats.length - 2];

    const changeRating = this.getPercentageChange(prevMonth?.rating, lastMonth?.rating);
    const changeReviews = this.getPercentageChange(prevMonth?.reviews, lastMonth?.reviews);

    // Daily stats for chart
    const dailyStats = insights.map(entry => ({
      date: format(entry.createdAt, 'yyyy-MM-dd'),
      rating: entry.avgRating,
      reviews: entry.totalReviews,
    }));

    return {
      table: {
        Data: [...monthStats.map(m => format(new Date(`${m.month}-01`), 'MMMM')), 'Change %'],
        'Star Rating': [...monthStats.map(m => m.rating.toFixed(2)), `${changeRating.toFixed(2)}%`],
        'Total Review': [...monthStats.map(m => m.reviews.toString()), `${changeReviews.toFixed(2)}%`],
      },
      chart: dailyStats,
    };
  }


  async gbpList(businessId: string) {
    return this._gbpInsightsRepository.model.gbpInsight.findMany({
      where: { businessId },
    });
  }
  // -------

  async getWebsitePerformanceReport(businessId: string, days: string) {
    const range = parseInt(days || '30', 10);
    const today = new Date();
    const startDate = subDays(today, range);

    const insights = await this._websitePerformanceRepo.model.websitePerformance.findMany({
      where: {
        businessId,
        createdAt: { gte: startDate, lte: today }
      },
      orderBy: { createdAt: 'asc' }
    });

    if (!insights.length) {
      return {
        table: {
          Data: [],
          'Page views': [],
          'Visits': [],
          'Visitors': [],
          'Posts': [],
          'Comments': []
        },
        chart: []
      };
    }

    // ✅ Group by month for table data
    const monthGroups = insights.reduce((acc, record) => {
      const month = format(record.createdAt, 'MMMM'); // "April", "May", etc.
      if (!acc[month]) {
        acc[month] = { pageViews: 0, visits: 0, visitors: 0 };
      }
      acc[month].pageViews += record.pageViews;
      acc[month].visits += record.visits;
      acc[month].visitors += record.visitors;
      return acc;
    }, {});

    // ✅ Sort months in chronological order (not alphabetical!)
    const months = Object.keys(monthGroups).sort((a, b) => {
      const dateA = parse(a, 'MMMM', new Date());
      const dateB = parse(b, 'MMMM', new Date());
      return getMonth(dateA) - getMonth(dateB);
    });

    const [currentMonth, previousMonth] = months.slice(-2);

    // ✅ Prepare daily chart data
    const chartData = insights.map(record => ({
      date: format(record.createdAt, 'yyyy-MM-dd'),
      pageViews: record.pageViews,
      visits: record.visits,
      visitors: record.visitors,
      posts: 0,     // Hardcoded
      comments: 0   // Hardcoded
    }));

    return {
      table: {
        Data: [...months.map(m => m), 'Change %'],
        'Page views': [
          ...months.map(m => monthGroups[m].pageViews.toString()),
          this.calculateChanges(
            monthGroups[previousMonth]?.pageViews,
            monthGroups[currentMonth]?.pageViews
          )
        ],
        'Visits': [
          ...months.map(m => monthGroups[m].visits.toString()),
          this.calculateChanges(
            monthGroups[previousMonth]?.visits,
            monthGroups[currentMonth]?.visits
          )
        ],
        'Visitors': [
          ...months.map(m => monthGroups[m].visitors.toString()),
          this.calculateChanges(
            monthGroups[previousMonth]?.visitors,
            monthGroups[currentMonth]?.visitors
          )
        ],
        'Posts': [
          ...months.map(() => '0'),
          '0%'
        ],
        'Comments': [
          ...months.map(() => '0'),
          '0%'
        ]
      },
      chart: chartData
    };
  }

  // ✅ Helper function for calculating percentage change
  private calculateChanges(prev: number = 0, current: number = 0): string {
    if (!prev) return '0%';
    const diff = current - prev;
    const percent = (diff / prev) * 100;
    return `${percent.toFixed(2)}%`;
  }


  // ---------

  async getWebsiteLocationsReport(businessId: string, days: string) {
    const range = parseInt(days || '30', 10);
    const today = new Date();
    const comparisonStartDate = subDays(today, range * 2);
    const currentStartDate = subDays(today, range);

    const locations = await this._websiteLocationRepo.model.websiteLocation.findMany({
      where: {
        businessId,
        createdAt: {
          gte: comparisonStartDate,
          lte: today
        },
        rank: { lte: 10 }
      },
      orderBy: [{ createdAt: 'asc' }, { visitors: 'desc' }]
    });

    if (!locations.length) {
      return {
        table: { Data: [], rows: [] },
        chart: []
      };
    }

    // 🗃️ Group data: { country -> yyyy-MM -> visitors }
    const grouped: Record<string, Record<string, number>> = {};
    const currentMonthsSet = new Set<string>();

    for (const loc of locations) {
      const monthKey = format(loc.createdAt, 'yyyy-MM');
      if (loc.createdAt >= currentStartDate) {
        currentMonthsSet.add(monthKey);
      }
      if (!grouped[loc.country]) grouped[loc.country] = {};
      if (!grouped[loc.country][monthKey]) grouped[loc.country][monthKey] = 0;
      grouped[loc.country][monthKey] += loc.visitors;
    }

    // 🗓️ Sorted unique months (current only)
    const allMonths = Array.from(currentMonthsSet)
      .sort((a, b) => {
        const dateA = parseISO(a + '-01');
        const dateB = parseISO(b + '-01');
        return compareAsc(dateA, dateB);
      })
      .map(m => format(parseISO(m + '-01'), 'MMMM'));

    const lastMonthName = allMonths[allMonths.length - 1];

    // 📊 Build rows: [country, m1, m2, ..., change%]
    const rows = Object.entries(grouped).map(([country, monthMap]) => {
      const monthValues = allMonths.map(monthName => {
        const matchingKey = Object.keys(monthMap).find(k => {
          const parsed = parseISO(k + '-01');
          return format(parsed, 'MMMM') === monthName;
        });
        return matchingKey ? monthMap[matchingKey].toString() : '0';
      });

      const first = parseInt(monthValues[0] || '0', 10);
      const last = parseInt(monthValues[monthValues.length - 1] || '0', 10);
      const change = this.calculateLocationChange(first, last);

      return [country, ...monthValues, change];
    });

    // 👉 Sort rows by total visitors in current period
    const topRows = rows
      .map(r => ({
        row: r,
        total: r.slice(1, -1).reduce((sum, v) => sum + parseInt(v, 10), 0)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map(x => x.row);

    // ✅ Prepare chart:
    // get top 10 countries by last month value
    const lastMonthIndex = allMonths.indexOf(lastMonthName) + 1; // +1 for country
    const allCountriesForChart = rows
      .map(r => ({
        country: r[0],
        visitors: parseInt(r[lastMonthIndex] || '0', 10)
      }))
      .filter(r => r.visitors > 0)
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 10);

    // Total visitors in last month for percent calculation
    const totalLastMonthVisitors = allCountriesForChart.reduce(
      (sum, c) => sum + c.visitors,
      0
    );

    const chart = allCountriesForChart.map(c => ({
      country: c.country,
      visitors: c.visitors,
      percent: totalLastMonthVisitors
        ? parseFloat(((c.visitors / totalLastMonthVisitors) * 100).toFixed(2))
        : 0
    }));

    return {
      table: {
        Data: ['Data', ...allMonths, 'Change %'],
        rows: topRows
      },
      chart
    };
  }

  private calculateLocationChange(prev: number, curr: number) {
    if (prev === 0) return curr === 0 ? '0%' : '100%';
    return (((curr - prev) / prev) * 100).toFixed(2) + '%';
  }






  async getPinterestCommunityReport(businessId: string, days: string) {
    const range = parseInt(days || '30', 10);
    const today = new Date();
    const startDate = subDays(today, range);

    const insights = await this._pinterestPostPerformanceRepo.model.pinterestPostPerformance.findMany({
      where: { businessId, createdAt: { gte: startDate, lte: today } },
      orderBy: { createdAt: 'asc' }
    });

    if (!insights.length) {
      return {
        table: {
          Data: [],
          Followers: [],
          Following: [],
          Posts: []
        },
        chart: []
      };
    }

    const monthGroups = new Map();
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
      posts: data.totalContent || 0
    }));

    const lastMonth = stats[stats.length - 1];
    const prevMonth = stats[stats.length - 2];

    const changeFollowers = this.getPercentageChange(prevMonth?.followers, lastMonth?.followers);
    const changeFollowing = this.getPercentageChange(prevMonth?.following, lastMonth?.following);
    const changePosts = this.getPercentageChange(prevMonth?.posts, lastMonth?.posts);

    // ✅ Correct chart with all 3 fields
    const chart = insights.map(i => ({
      date: format(i.createdAt, 'yyyy-MM-dd'),
      followers: i?.['followers'] || 0,
      following: i?.['following'] || 0,
      posts: i.totalContent || 0
    }));

    return {
      table: {
        Data: [...stats.map(s => format(new Date(`${s.month}-01`), 'MMMM')), 'Change %'],
        Followers: [...stats.map(s => s.followers.toString()), `${changeFollowers.toFixed(2)}%`],
        Following: [...stats.map(s => s.following.toString()), `${changeFollowing.toFixed(2)}%`],
        Posts: [...stats.map(s => s.posts.toString()), `${changePosts.toFixed(2)}%`]
      },
      chart
    };
  }

  async getPinterestOverviewReport(businessId: string, days: string) {
    const range = parseInt(days || '30', 10);
    const today = new Date();
    const startDate = subDays(today, range);

    const insights = await this._pinterestPostPerformanceRepo.model.pinterestPostPerformance.findMany({
      where: { businessId, createdAt: { gte: startDate, lte: today } },
      orderBy: { createdAt: 'asc' }
    });

    if (!insights.length) {
      return {
        table: {
          Data: [],
          Impressions: [],
          Posts: []
        },
        chart: []
      };
    }

    // Group by month
    const monthGroups = new Map();
    for (const record of insights) {
      const month = format(record.createdAt, 'yyyy-MM');
      if (!monthGroups.has(month)) {
        monthGroups.set(month, []);
      }
      monthGroups.get(month).push(record);
    }

    const stats = [...monthGroups.entries()].map(([month, data]) => ({
      month,
      impressions: data.reduce((sum, d) => sum + d.impressions, 0),
      posts: Math.max(...data.map(d => d.totalContent))
    }));

    const lastMonth = stats[stats.length - 1];
    const prevMonth = stats[stats.length - 2];

    const changeImpressions = this.getPercentageChange(prevMonth?.impressions, lastMonth?.impressions);
    const changePosts = this.getPercentageChange(prevMonth?.posts, lastMonth?.posts);

    const chart = insights.map(i => ({
      date: format(i.createdAt, 'yyyy-MM-dd'),
      impressions: i.impressions,
      posts: i.totalContent
    }));

    return {
      table: {
        Data: [...stats.map(s => format(new Date(`${s.month}-01`), 'MMMM')), 'Change %'],
        Impressions: [...stats.map(s => s.impressions.toString()), `${changeImpressions.toFixed(2)}%`],
        Posts: [...stats.map(s => s.posts.toString()), `${changePosts.toFixed(2)}%`]
      },
      chart
    };


  }
  //hospital

  private getHospitalTable(): any {
    console.log('getHospitalTable called'); // Debug log
    return {
      Data: ['Month', 'Patients', 'Change %'],
      Rows: [
        ['January', '1200', '+5%'],
        ['February', '1350', '+12.5%'],
        ['March', '1420', '+5.2%']
      ],
      Growth: 'Patient count increasing steadily'
    };
  }

}