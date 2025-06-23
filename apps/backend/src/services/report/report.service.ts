import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { subDays, format } from 'date-fns';

@Injectable()
export class ReportService {
  constructor(
    private _instagramInsightsRepository: PrismaRepository<'instagramInsight'>,
    private _xInsightsRepository: PrismaRepository<'xInsight'>,
    private _youtubeInsightsRepository: PrismaRepository<'youTubeInsight'>,
    private _facebookInsightsRepository: PrismaRepository<'facebookInsight'>,
    private _threadsInsightsRepository: PrismaRepository<'threadsInsight'>,
    private _linkedInInsightsRepository: PrismaRepository<'linkedInInsight'>,
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

  async getYoutubeOverviewReport(channelId: string, days: string) {
    const range = parseInt(days || '30', 10);
    const today = new Date();
    const startDate = subDays(today, range);

    const insights = await this._youtubeInsightsRepository.model.youTubeInsight.findMany({
      where: {
        channelId,
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
        Subscribers: [],
        TotalViews: [],
        TotalVideos: [],
        dailyStats: [],
      };
    }

    const dailyStats = insights.map((entry) => ({
      date: entry.createdAt.toISOString().split('T')[0],
      subscribers: entry.subscribers,
      totalViews: entry.totalViews,
      totalVideos: entry.totalVideos,
    }));

    const monthGroups = new Map<string, {
      subscribers: number[];
      views: number[];
      videos: number[]
    }>();

    for (const record of insights) {
      const month = record.createdAt.toISOString().slice(0, 7);
      if (!monthGroups.has(month)) {
        monthGroups.set(month, { subscribers: [], views: [], videos: [] });
      }

      const group = monthGroups.get(month);
      group.subscribers.push(record.subscribers);
      group.views.push(record.totalViews);
      group.videos.push(record.totalVideos);
    }

    const monthStats = [...monthGroups.entries()].map(([month, values]) => ({
      month,
      subscribers: Math.round(values.subscribers.reduce((a, b) => a + b, 0) / values.subscribers.length),
      totalViews: values.views[values.views.length - 1],
      totalVideos: values.videos[values.videos.length - 1],
    }));

    const lastMonth = monthStats[monthStats.length - 1];
    const prevMonth = monthStats[monthStats.length - 2];

    const changeSubscribers = this.getPercentageChange(prevMonth?.subscribers, lastMonth?.subscribers);
    const changeViews = this.getPercentageChange(prevMonth?.totalViews, lastMonth?.totalViews);

    return {
      table: {
        Data: [...monthStats.map((m) => new Date(`${m.month}-01`).toLocaleString('default', { month: 'long' })), 'Change %'],
        Subscribers: [...monthStats.map((m) => this.kFormatter(m.subscribers)), `${changeSubscribers.toFixed(2)}%`],
        TotalViews: [...monthStats.map((m) => this.kFormatter(m.totalViews)), `${changeViews.toFixed(2)}%`],
        TotalVideos: [...monthStats.map((m) => m.totalVideos.toString()), '0%'],
      },
      chart: dailyStats,
    };
  }

  async youtubeInsightList(channelId: string) {
    return this._youtubeInsightsRepository.model.youTubeInsight.findMany({
      where: { channelId },
    });
  }

  async deleteYoutubeInsight(id: string) {
    return this._youtubeInsightsRepository.model.youTubeInsight.delete({
      where: { id }
    });
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////

  // Facebook methods
  async getFacebookOverviewReport(pageId: string, days: string) {
    const range = parseInt(days || '30', 10);
    const today = new Date();
    const startDate = subDays(today, range);

    const insights = await this._facebookInsightsRepository.model.facebookInsight.findMany({
      where: {
        pageId,
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

  async getFacebookCommunityReport(pageId: string, days: string) {
    const range = parseInt(days || '30', 10);
    const today = new Date();
    const startDate = subDays(today, range);

    const insights = await this._facebookInsightsRepository.model.facebookInsight.findMany({
      where: {
        pageId,
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

  async facebookInsightList(pageId: string) {
    return this._facebookInsightsRepository.model.facebookInsight.findMany({
      where: { pageId },
    });
  }

  async deleteFacebookInsight(id: string) {
    return this._facebookInsightsRepository.model.facebookInsight.delete({
      where: { id }
    });
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////

  async getThreadsGrowthReport(accountId: string, months: number) {
    const date = new Date();
    date.setMonth(date.getMonth() - months);

    const insights = await this._threadsInsightsRepository.model.threadsInsight.findMany({
      where: {
        accountId,
        createdAt: {
          gte: date
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Group by month
    const monthGroups = new Map<string, { followers: number; posts: number }>();

    for (const record of insights) {
      if (!monthGroups.has(record.month)) {
        monthGroups.set(record.month, {
          followers: record.followers,
          posts: record.posts
        });
      }
    }

    const sortedMonths = [...monthGroups.entries()].sort();
    const monthNames = sortedMonths.map(([month]) => format(new Date(`${month}-01`), 'MMMM'));

    const followers = sortedMonths.map(([, data]) => data.followers.toString());
    const posts = sortedMonths.map(([, data]) => data.posts.toString());

    // Calculate changes
    let followersChange = '0%';
    let postsChange = '0%';

    if (sortedMonths.length >= 2) {
      const last = sortedMonths[sortedMonths.length - 1][1];
      const prev = sortedMonths[sortedMonths.length - 2][1];

      followersChange = this.getPercentageChange(prev.followers, last.followers).toFixed(2) + '%';
      postsChange = this.getPercentageChange(prev.posts, last.posts).toFixed(2) + '%';
    }

    return {
      table: {
        Data: [...monthNames, 'Change %'],
        Followers: [...followers, followersChange],
        Posts: [...posts, postsChange]
      }
    };
  }

  async getThreadsPerformanceReport(accountId: string, months: number) {
    const date = new Date();
    date.setMonth(date.getMonth() - months);

    const insights = await this._threadsInsightsRepository.model.threadsInsight.findMany({
      where: {
        accountId,
        createdAt: {
          gte: date
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Group by month
    const monthGroups = new Map<string, {
      engagement: number;
      interactions: number;
      impressions: number;
      posts: number
    }>();

    for (const record of insights) {
      if (!monthGroups.has(record.month)) {
        monthGroups.set(record.month, {
          engagement: record.engagement,
          interactions: record.interactions,
          impressions: record.impressions,
          posts: record.posts
        });
      }
    }

    const sortedMonths = [...monthGroups.entries()].sort();
    const monthNames = sortedMonths.map(([month]) => format(new Date(`${month}-01`), 'MMMM'));

    const engagement = sortedMonths.map(([, data]) => data.engagement.toFixed(2));
    const interactions = sortedMonths.map(([, data]) => data.interactions.toString());
    const impressions = sortedMonths.map(([, data]) => data.impressions.toString());
    const posts = sortedMonths.map(([, data]) => data.posts.toString());

    // Calculate changes
    let engagementChange = '0%';
    let interactionsChange = '0%';
    let impressionsChange = '0%';
    let postsChange = '0%';

    if (sortedMonths.length >= 2) {
      const last = sortedMonths[sortedMonths.length - 1][1];
      const prev = sortedMonths[sortedMonths.length - 2][1];

      engagementChange = this.getPercentageChange(prev.engagement, last.engagement).toFixed(2) + '%';
      interactionsChange = this.getPercentageChange(prev.interactions, last.interactions).toFixed(2) + '%';
      impressionsChange = this.getPercentageChange(prev.impressions, last.impressions).toFixed(2) + '%';
      postsChange = this.getPercentageChange(prev.posts, last.posts).toFixed(2) + '%';
    }

    return {
      table: {
        Data: [...monthNames, 'Change %'],
        Engagement: [...engagement, engagementChange],
        Interactions: [...interactions, interactionsChange],
        Impressions: [...impressions, impressionsChange],
        Posts: [...posts, postsChange]
      }
    };
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////

  // Add to your report service
  async getLinkedInOverviewReport(pageId: string, days: string) {
    const range = parseInt(days || '30', 10);
    const today = new Date();
    const startDate = subDays(today, range);

    const insights = await this._linkedInInsightsRepository.model.linkedInInsight.findMany({
      where: {
        pageId,
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

  async getLinkedInCommunityReport(pageId: string, days: string) {
    const range = parseInt(days || '30', 10);
    const today = new Date();
    const startDate = subDays(today, range);

    const insights = await this._linkedInInsightsRepository.model.linkedInInsight.findMany({
      where: {
        pageId,
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

  async linkedInInsightList(pageId: string) {
    return this._linkedInInsightsRepository.model.linkedInInsight.findMany({
      where: { pageId },
    });
  }

  async deleteLinkedInInsight(id: string) {
    return this._linkedInInsightsRepository.model.linkedInInsight.delete({
      where: { id }
    });
  }

}
