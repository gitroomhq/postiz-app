import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { PrismaService } from '../database.module';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string) {
    return this.prisma.campaign.findMany({
      where: { organizationId },
      include: {
        template: { select: { id: true, name: true } },
        channels: {
          include: {
            integration: {
              select: { id: true, platform: true, name: true, profilePicture: true },
            },
          },
        },
        _count: { select: { posts: true, calendarSlots: true, assets: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    user: AuthUser,
    data: {
      name: string;
      description?: string;
      mode: 'FULLY_AUTOMATED' | 'SEMI_AUTOMATED' | 'MANUAL';
      templateId?: string;
      startDate: string;
      endDate: string;
      postsPerWeek?: number;
      preferredTimes?: number[];
      integrationIds: string[];
    },
  ) {
    if (!data.integrationIds || data.integrationIds.length === 0) {
      throw new BadRequestException('At least one integration is required');
    }

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Verify all integrations belong to the org
    const integrations = await this.prisma.integration.findMany({
      where: {
        id: { in: data.integrationIds },
        organizationId: user.organizationId,
        disabled: false,
      },
    });

    if (integrations.length !== data.integrationIds.length) {
      throw new BadRequestException('One or more integrations not found or disabled');
    }

    // Verify template if provided
    if (data.templateId) {
      const template = await this.prisma.template.findFirst({
        where: { id: data.templateId, organizationId: user.organizationId },
      });
      if (!template) {
        throw new BadRequestException('Template not found');
      }
    }

    const campaign = await this.prisma.campaign.create({
      data: {
        organizationId: user.organizationId,
        createdBy: user.id,
        name: data.name,
        description: data.description || null,
        mode: data.mode,
        templateId: data.templateId || null,
        startDate,
        endDate,
        postsPerWeek: data.postsPerWeek || 3,
        preferredTimes: data.preferredTimes || [540, 720, 1020], // 9am, 12pm, 5pm UTC
        status: 'DRAFT',
      },
    });

    // Create campaign channels
    await this.prisma.campaignChannel.createMany({
      data: data.integrationIds.map((integrationId) => ({
        campaignId: campaign.id,
        integrationId,
      })),
    });

    // Create calendar slots based on campaign schedule
    await this.createCalendarSlots(
      campaign.id,
      user.organizationId,
      startDate,
      endDate,
      data.postsPerWeek || 3,
      data.preferredTimes || [540, 720, 1020],
      data.integrationIds,
    );

    return this.detail(user.organizationId, campaign.id);
  }

  async detail(organizationId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
      include: {
        template: { select: { id: true, name: true, category: true } },
        creator: { select: { id: true, name: true, email: true } },
        channels: {
          include: {
            integration: {
              select: { id: true, platform: true, name: true, profilePicture: true },
            },
          },
        },
        calendarSlots: {
          orderBy: { date: 'asc' },
          include: { post: { select: { id: true, state: true, content: true } } },
        },
        assets: {
          include: { media: { select: { id: true, name: true, path: true, type: true } } },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            posts: true,
            calendarSlots: true,
            assets: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Compute post counts by state
    const postCountsByState = await this.prisma.post.groupBy({
      by: ['state'],
      where: { campaignId: id, organizationId },
      _count: { id: true },
    });

    return {
      ...campaign,
      postCountsByState: postCountsByState.reduce(
        (acc, item) => ({ ...acc, [item.state]: item._count.id }),
        {} as Record<string, number>,
      ),
    };
  }

  async update(
    organizationId: string,
    id: string,
    data: {
      name?: string;
      description?: string;
      status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
      templateId?: string;
      startDate?: string;
      endDate?: string;
      postsPerWeek?: number;
      preferredTimes?: number[];
    },
  ) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.templateId !== undefined) updateData.templateId = data.templateId;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
    if (data.postsPerWeek !== undefined) updateData.postsPerWeek = data.postsPerWeek;
    if (data.preferredTimes !== undefined) updateData.preferredTimes = data.preferredTimes;

    return this.prisma.campaign.update({
      where: { id },
      data: updateData,
      include: {
        template: { select: { id: true, name: true } },
        channels: {
          include: {
            integration: { select: { id: true, platform: true, name: true } },
          },
        },
      },
    });
  }

  async remove(organizationId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    await this.prisma.campaign.delete({ where: { id } });
    return { success: true };
  }

  generatePlan(organizationId: string, id: string): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();

    // Execute plan generation asynchronously
    this.executeGeneratePlan(organizationId, id, subject).catch((err) => {
      subject.next({
        data: JSON.stringify({ type: 'error', message: err.message }),
      } as MessageEvent);
      subject.complete();
    });

    return subject.asObservable();
  }

  private async executeGeneratePlan(
    organizationId: string,
    id: string,
    subject: Subject<MessageEvent>,
  ) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
      include: {
        template: true,
        channels: { include: { integration: true } },
        calendarSlots: { where: { status: 'EMPTY' }, orderBy: { date: 'asc' } },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    subject.next({
      data: JSON.stringify({
        type: 'progress',
        message: 'Starting plan generation...',
        total: campaign.calendarSlots.length,
        completed: 0,
      }),
    } as MessageEvent);

    // Process each empty slot
    for (let i = 0; i < campaign.calendarSlots.length; i++) {
      const slot = campaign.calendarSlots[i];

      // Update slot with a generated topic placeholder
      await this.prisma.calendarSlot.update({
        where: { id: slot.id },
        data: {
          topic: `Generated topic for ${slot.date.toISOString().split('T')[0]}`,
          status: 'FILLED',
        },
      });

      subject.next({
        data: JSON.stringify({
          type: 'progress',
          message: `Generated plan for slot ${i + 1}/${campaign.calendarSlots.length}`,
          total: campaign.calendarSlots.length,
          completed: i + 1,
          slotId: slot.id,
        }),
      } as MessageEvent);
    }

    // Update campaign status to active
    await this.prisma.campaign.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    subject.next({
      data: JSON.stringify({
        type: 'complete',
        message: 'Plan generation complete',
        total: campaign.calendarSlots.length,
      }),
    } as MessageEvent);

    subject.complete();
  }

  async uploadAssets(
    organizationId: string,
    id: string,
    data: { mediaIds?: string[]; urls?: string[] },
  ) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const created = [];

    // Add media-based assets
    if (data.mediaIds && data.mediaIds.length > 0) {
      for (const mediaId of data.mediaIds) {
        const asset = await this.prisma.campaignAsset.create({
          data: {
            campaignId: id,
            mediaId,
          },
          include: { media: { select: { id: true, name: true, path: true, type: true } } },
        });
        created.push(asset);
      }
    }

    // Add URL-based assets
    if (data.urls && data.urls.length > 0) {
      for (const url of data.urls) {
        const asset = await this.prisma.campaignAsset.create({
          data: {
            campaignId: id,
            url,
          },
        });
        created.push(asset);
      }
    }

    return { assets: created, count: created.length };
  }

  async processAssets(organizationId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const unprocessedAssets = await this.prisma.campaignAsset.findMany({
      where: { campaignId: id, processed: false },
      include: { media: true },
    });

    if (unprocessedAssets.length === 0) {
      return { message: 'No unprocessed assets found', processed: 0 };
    }

    // Mark assets as processed (actual AI processing would be done via a queue/worker)
    const processed = [];
    for (const asset of unprocessedAssets) {
      const updated = await this.prisma.campaignAsset.update({
        where: { id: asset.id },
        data: {
          processed: true,
          extractedText: asset.url
            ? `Content extracted from ${asset.url}`
            : asset.media
              ? `Content described from image: ${asset.media.name}`
              : null,
        },
      });
      processed.push(updated);
    }

    return { processed: processed.length, assets: processed };
  }

  /**
   * Create calendar slots distributed across the campaign date range.
   * Slots are distributed evenly across weeks, assigned round-robin to integrations.
   */
  private async createCalendarSlots(
    campaignId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date,
    postsPerWeek: number,
    preferredTimes: number[],
    integrationIds: string[],
  ) {
    const slots: {
      campaignId: string;
      organizationId: string;
      date: Date;
      integrationId: string;
      status: 'EMPTY';
    }[] = [];

    const current = new Date(startDate);
    let dayIndex = 0;
    const totalDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Calculate days between posts within a week
    const daysBetweenPosts = Math.max(1, Math.floor(7 / postsPerWeek));
    let integrationIndex = 0;

    while (current <= endDate) {
      if (dayIndex % daysBetweenPosts === 0) {
        // Pick a time from preferred times
        const timeMinutes =
          preferredTimes[slots.length % preferredTimes.length] || 540;
        const slotDate = new Date(current);
        slotDate.setUTCHours(Math.floor(timeMinutes / 60), timeMinutes % 60, 0, 0);

        // Assign integration round-robin
        const integrationId =
          integrationIds[integrationIndex % integrationIds.length];
        integrationIndex++;

        slots.push({
          campaignId,
          organizationId,
          date: slotDate,
          integrationId,
          status: 'EMPTY',
        });
      }

      current.setDate(current.getDate() + 1);
      dayIndex++;
    }

    if (slots.length > 0) {
      await this.prisma.calendarSlot.createMany({ data: slots });
    }

    return slots.length;
  }
}
