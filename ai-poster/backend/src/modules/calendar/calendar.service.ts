import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database.module';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async getCalendar(
    organizationId: string,
    filters: {
      start: Date;
      end: Date;
      campaignIds?: string[];
      integrationIds?: string[];
      states?: string[];
    },
  ) {
    const where: any = {
      organizationId,
      publishDate: {
        gte: filters.start,
        lte: filters.end,
      },
    };

    if (filters.campaignIds && filters.campaignIds.length > 0) {
      where.campaignId = { in: filters.campaignIds };
    }
    if (filters.integrationIds && filters.integrationIds.length > 0) {
      where.integrationId = { in: filters.integrationIds };
    }
    if (filters.states && filters.states.length > 0) {
      where.state = { in: filters.states };
    }

    const posts = await this.prisma.post.findMany({
      where,
      include: {
        integration: {
          select: { id: true, platform: true, name: true, profilePicture: true },
        },
        campaign: { select: { id: true, name: true } },
        postMedia: {
          include: {
            media: {
              select: { id: true, name: true, path: true, type: true, thumbnail: true },
            },
          },
          orderBy: { order: 'asc' },
          take: 1,
        },
        tags: { include: { tag: true } },
      },
      orderBy: { publishDate: 'asc' },
    });

    // Group posts by date for calendar view
    const grouped: Record<
      string,
      typeof posts
    > = {};

    for (const post of posts) {
      if (!post.publishDate) continue;
      const dateKey = post.publishDate.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(post);
    }

    return {
      posts,
      grouped,
      total: posts.length,
      range: { start: filters.start, end: filters.end },
    };
  }

  async getSlots(organizationId: string, campaignId: string) {
    if (!campaignId) {
      throw new BadRequestException('campaignId is required');
    }

    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, organizationId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return this.prisma.calendarSlot.findMany({
      where: { campaignId, organizationId },
      include: {
        post: {
          select: {
            id: true,
            content: true,
            state: true,
            integration: { select: { id: true, platform: true, name: true } },
          },
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  async updateSlot(
    organizationId: string,
    id: string,
    data: { topic?: string; status?: 'EMPTY' | 'FILLED' | 'SKIPPED' },
  ) {
    const slot = await this.prisma.calendarSlot.findFirst({
      where: { id, organizationId },
    });

    if (!slot) {
      throw new NotFoundException('Calendar slot not found');
    }

    const updateData: any = {};
    if (data.topic !== undefined) updateData.topic = data.topic;
    if (data.status !== undefined) updateData.status = data.status;

    return this.prisma.calendarSlot.update({
      where: { id },
      data: updateData,
      include: {
        post: {
          select: { id: true, content: true, state: true },
        },
      },
    });
  }

  async findNextAvailableSlot(
    organizationId: string,
    integrationId: string,
    afterDate?: Date,
  ) {
    const searchDate = afterDate || new Date();

    // First check if this integration has any active campaigns
    const campaignChannels = await this.prisma.campaignChannel.findMany({
      where: {
        integrationId,
        campaign: {
          organizationId,
          status: 'ACTIVE',
        },
      },
      select: { campaignId: true },
    });

    if (campaignChannels.length === 0) {
      // No active campaigns - suggest a time based on platform profile
      const profile = await this.prisma.platformProfile.findFirst({
        where: { integrationId, organizationId },
      });

      const preferredTimes = profile?.preferredTimes || [540]; // Default 9am UTC
      const nextDate = new Date(searchDate);
      nextDate.setDate(nextDate.getDate() + 1);
      const timeMinutes = preferredTimes[0];
      nextDate.setUTCHours(Math.floor(timeMinutes / 60), timeMinutes % 60, 0, 0);

      return {
        suggestedDate: nextDate,
        source: 'profile',
        slotId: null,
      };
    }

    // Look for empty slots in active campaigns for this integration
    const emptySlot = await this.prisma.calendarSlot.findFirst({
      where: {
        organizationId,
        campaignId: { in: campaignChannels.map((cc) => cc.campaignId) },
        status: 'EMPTY',
        date: { gt: searchDate },
        integrationId,
      },
      orderBy: { date: 'asc' },
      include: {
        campaign: { select: { id: true, name: true } },
      },
    });

    if (emptySlot) {
      return {
        suggestedDate: emptySlot.date,
        source: 'slot',
        slotId: emptySlot.id,
        campaign: emptySlot.campaign,
        topic: emptySlot.topic,
      };
    }

    // No empty slots - find a gap in existing posts for this integration
    const lastPost = await this.prisma.post.findFirst({
      where: {
        organizationId,
        integrationId,
        publishDate: { gt: searchDate },
      },
      orderBy: { publishDate: 'desc' },
    });

    const suggestedDate = new Date(
      lastPost?.publishDate || searchDate,
    );
    suggestedDate.setDate(suggestedDate.getDate() + 1);
    suggestedDate.setUTCHours(9, 0, 0, 0);

    return {
      suggestedDate,
      source: 'computed',
      slotId: null,
    };
  }
}
