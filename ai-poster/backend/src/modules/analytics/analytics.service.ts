import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database.module';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(organizationId: string) {
    // Total posts by state
    const postsByState = await this.prisma.post.groupBy({
      by: ['state'],
      where: { organizationId },
      _count: { id: true },
    });

    const totalPosts = postsByState.reduce(
      (sum, item) => sum + item._count.id,
      0,
    );

    const publishedPosts =
      postsByState.find((p) => p.state === 'POSTED')?._count.id || 0;

    // Aggregate engagement metrics
    const engagement = await this.prisma.analytics.aggregate({
      where: {
        post: { organizationId },
      },
      _sum: {
        impressions: true,
        likes: true,
        comments: true,
        shares: true,
        clicks: true,
        saves: true,
      },
      _avg: {
        engagementRate: true,
      },
    });

    // Top platforms by post count
    const platformCounts = await this.prisma.post.groupBy({
      by: ['integrationId'],
      where: { organizationId, state: 'POSTED' },
      _count: { id: true },
    });

    const integrationIds = platformCounts.map((p) => p.integrationId);
    const integrations = await this.prisma.integration.findMany({
      where: { id: { in: integrationIds } },
      select: { id: true, platform: true, name: true },
    });

    const integrationMap = new Map(
      integrations.map((i) => [i.id, i]),
    );

    const topPlatforms = platformCounts
      .map((pc) => {
        const integration = integrationMap.get(pc.integrationId);
        return {
          integrationId: pc.integrationId,
          platform: integration?.platform || 'UNKNOWN',
          name: integration?.name || 'Unknown',
          postCount: pc._count.id,
        };
      })
      .sort((a, b) => b.postCount - a.postCount);

    // Active campaigns
    const activeCampaigns = await this.prisma.campaign.count({
      where: { organizationId, status: 'ACTIVE' },
    });

    // Pending approvals
    const pendingApprovals = await this.prisma.post.count({
      where: {
        organizationId,
        state: { in: ['AI_GENERATED', 'PENDING_APPROVAL'] },
      },
    });

    return {
      totalPosts,
      publishedPosts,
      activeCampaigns,
      pendingApprovals,
      postsByState: postsByState.reduce(
        (acc, item) => ({ ...acc, [item.state]: item._count.id }),
        {} as Record<string, number>,
      ),
      engagement: {
        totalImpressions: engagement._sum.impressions || 0,
        totalLikes: engagement._sum.likes || 0,
        totalComments: engagement._sum.comments || 0,
        totalShares: engagement._sum.shares || 0,
        totalClicks: engagement._sum.clicks || 0,
        totalSaves: engagement._sum.saves || 0,
        averageEngagementRate:
          Math.round((engagement._avg.engagementRate || 0) * 100) / 100,
      },
      topPlatforms,
    };
  }

  async getPostAnalytics(organizationId: string, postId: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, organizationId },
      select: {
        id: true,
        content: true,
        state: true,
        publishedAt: true,
        platformPostId: true,
        platformUrl: true,
        integration: { select: { id: true, platform: true, name: true } },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const analytics = await this.prisma.analytics.findMany({
      where: { postId },
      orderBy: { fetchedAt: 'desc' },
    });

    const latest = analytics[0] || null;

    // Compute trend if multiple snapshots exist
    const trend =
      analytics.length >= 2
        ? {
            impressionsChange:
              (analytics[0].impressions || 0) -
              (analytics[1].impressions || 0),
            likesChange:
              (analytics[0].likes || 0) - (analytics[1].likes || 0),
            commentsChange:
              (analytics[0].comments || 0) -
              (analytics[1].comments || 0),
            sharesChange:
              (analytics[0].shares || 0) - (analytics[1].shares || 0),
          }
        : null;

    return {
      post,
      latest,
      history: analytics,
      trend,
    };
  }

  async getChannelAnalytics(
    organizationId: string,
    integrationId: string,
    start?: Date,
    end?: Date,
  ) {
    const integration = await this.prisma.integration.findFirst({
      where: { id: integrationId, organizationId },
      select: { id: true, platform: true, name: true, profilePicture: true },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    const postWhere: any = {
      organizationId,
      integrationId,
      state: 'POSTED',
    };

    if (start || end) {
      postWhere.publishedAt = {};
      if (start) postWhere.publishedAt.gte = start;
      if (end) postWhere.publishedAt.lte = end;
    }

    const totalPosts = await this.prisma.post.count({ where: postWhere });

    const aggregate = await this.prisma.analytics.aggregate({
      where: {
        integrationId,
        post: postWhere,
      },
      _sum: {
        impressions: true,
        likes: true,
        comments: true,
        shares: true,
        clicks: true,
        saves: true,
      },
      _avg: {
        engagementRate: true,
      },
    });

    // Top performing posts by engagement
    const topPosts = await this.prisma.analytics.findMany({
      where: {
        integrationId,
        post: postWhere,
      },
      orderBy: { engagementRate: 'desc' },
      take: 5,
      include: {
        post: {
          select: {
            id: true,
            content: true,
            publishedAt: true,
            platformUrl: true,
          },
        },
      },
    });

    return {
      integration,
      totalPosts,
      metrics: {
        totalImpressions: aggregate._sum.impressions || 0,
        totalLikes: aggregate._sum.likes || 0,
        totalComments: aggregate._sum.comments || 0,
        totalShares: aggregate._sum.shares || 0,
        totalClicks: aggregate._sum.clicks || 0,
        totalSaves: aggregate._sum.saves || 0,
        averageEngagementRate:
          Math.round((aggregate._avg.engagementRate || 0) * 100) / 100,
      },
      topPosts,
    };
  }
}
