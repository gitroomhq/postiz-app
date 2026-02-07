import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database.module';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { PostState } from '@prisma/client';

// Valid state transitions for the post state machine
const STATE_TRANSITIONS: Record<PostState, PostState[]> = {
  DRAFT: [PostState.PENDING_APPROVAL, PostState.SCHEDULED, PostState.AI_GENERATED],
  AI_GENERATED: [PostState.PENDING_APPROVAL, PostState.APPROVED, PostState.DRAFT],
  PENDING_APPROVAL: [PostState.APPROVED, PostState.REJECTED, PostState.DRAFT],
  APPROVED: [PostState.SCHEDULED, PostState.DRAFT],
  SCHEDULED: [PostState.PUBLISHING, PostState.DRAFT, PostState.APPROVED],
  PUBLISHING: [PostState.POSTED, PostState.FAILED],
  POSTED: [],
  FAILED: [PostState.SCHEDULED, PostState.DRAFT],
  REJECTED: [PostState.DRAFT, PostState.AI_GENERATED],
};

function canTransition(from: PostState, to: PostState): boolean {
  return STATE_TRANSITIONS[from]?.includes(to) ?? false;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    organizationId: string,
    filters: {
      state?: string;
      campaignId?: string;
      integrationId?: string;
      start?: Date;
      end?: Date;
    },
  ) {
    const where: any = { organizationId };

    if (filters.state) {
      where.state = filters.state;
    }
    if (filters.campaignId) {
      where.campaignId = filters.campaignId;
    }
    if (filters.integrationId) {
      where.integrationId = filters.integrationId;
    }
    if (filters.start || filters.end) {
      where.publishDate = {};
      if (filters.start) where.publishDate.gte = filters.start;
      if (filters.end) where.publishDate.lte = filters.end;
    }

    return this.prisma.post.findMany({
      where,
      include: {
        integration: { select: { id: true, platform: true, name: true, profilePicture: true } },
        campaign: { select: { id: true, name: true } },
        template: { select: { id: true, name: true } },
        postMedia: {
          include: { media: true },
          orderBy: { order: 'asc' },
        },
        tags: { include: { tag: true } },
        _count: { select: { versions: true, approvals: true } },
      },
      orderBy: { publishDate: 'asc' },
    });
  }

  async create(
    organizationId: string,
    data: {
      integrationIds: string[];
      content: string;
      mediaIds?: string[];
      publishDate?: string;
      templateId?: string;
      platformSettings?: Record<string, any>;
      campaignId?: string;
    },
  ) {
    if (!data.integrationIds || data.integrationIds.length === 0) {
      throw new BadRequestException('At least one integrationId is required');
    }

    const plainText = stripHtml(data.content);
    const group = crypto.randomUUID();
    const createdPosts = [];

    for (const integrationId of data.integrationIds) {
      // Verify integration belongs to the organization
      const integration = await this.prisma.integration.findFirst({
        where: { id: integrationId, organizationId, disabled: false },
      });
      if (!integration) {
        throw new BadRequestException(`Integration ${integrationId} not found or disabled`);
      }

      const post = await this.prisma.post.create({
        data: {
          organizationId,
          integrationId,
          campaignId: data.campaignId || null,
          templateId: data.templateId || null,
          content: data.content,
          plainText,
          group,
          sourceType: 'MANUAL',
          state: data.publishDate ? 'SCHEDULED' : 'DRAFT',
          publishDate: data.publishDate ? new Date(data.publishDate) : null,
          platformSettings: data.platformSettings || undefined,
        },
        include: {
          integration: { select: { id: true, platform: true, name: true } },
        },
      });

      // Attach media if provided
      if (data.mediaIds && data.mediaIds.length > 0) {
        await this.prisma.postMedia.createMany({
          data: data.mediaIds.map((mediaId, index) => ({
            postId: post.id,
            mediaId,
            order: index,
          })),
        });
      }

      // Create initial version
      await this.prisma.postVersion.create({
        data: {
          postId: post.id,
          version: 1,
          content: data.content,
          mediaIds: data.mediaIds || [],
        },
      });

      createdPosts.push(post);
    }

    return createdPosts;
  }

  async detail(organizationId: string, id: string) {
    const post = await this.prisma.post.findFirst({
      where: { id, organizationId },
      include: {
        integration: { select: { id: true, platform: true, name: true, profilePicture: true } },
        campaign: { select: { id: true, name: true } },
        template: { select: { id: true, name: true } },
        postMedia: {
          include: { media: true },
          orderBy: { order: 'asc' },
        },
        versions: { orderBy: { version: 'desc' } },
        approvals: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },
        tags: { include: { tag: true } },
        childPosts: {
          include: {
            postMedia: { include: { media: true }, orderBy: { order: 'asc' } },
          },
          orderBy: { order: 'asc' },
        },
        analytics: { orderBy: { fetchedAt: 'desc' }, take: 1 },
        calendarSlot: true,
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  async update(
    organizationId: string,
    id: string,
    data: {
      content?: string;
      mediaIds?: string[];
      publishDate?: string;
      platformSettings?: Record<string, any>;
    },
  ) {
    const post = await this.prisma.post.findFirst({
      where: { id, organizationId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Only allow edits in certain states
    const editableStates: PostState[] = [
      PostState.DRAFT,
      PostState.AI_GENERATED,
      PostState.PENDING_APPROVAL,
      PostState.APPROVED,
      PostState.SCHEDULED,
      PostState.REJECTED,
    ];
    if (!editableStates.includes(post.state)) {
      throw new BadRequestException(`Cannot edit post in state ${post.state}`);
    }

    const updateData: any = {};
    if (data.content !== undefined) {
      updateData.content = data.content;
      updateData.plainText = stripHtml(data.content);
    }
    if (data.publishDate !== undefined) {
      updateData.publishDate = new Date(data.publishDate);
    }
    if (data.platformSettings !== undefined) {
      updateData.platformSettings = data.platformSettings;
    }

    const updated = await this.prisma.post.update({
      where: { id },
      data: updateData,
      include: {
        integration: { select: { id: true, platform: true, name: true } },
        postMedia: { include: { media: true }, orderBy: { order: 'asc' } },
      },
    });

    // Update media associations if provided
    if (data.mediaIds !== undefined) {
      await this.prisma.postMedia.deleteMany({ where: { postId: id } });
      if (data.mediaIds.length > 0) {
        await this.prisma.postMedia.createMany({
          data: data.mediaIds.map((mediaId, index) => ({
            postId: id,
            mediaId,
            order: index,
          })),
        });
      }
    }

    return updated;
  }

  async remove(organizationId: string, id: string) {
    const post = await this.prisma.post.findFirst({
      where: { id, organizationId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.state === PostState.PUBLISHING || post.state === PostState.POSTED) {
      throw new BadRequestException(`Cannot delete post in state ${post.state}`);
    }

    await this.prisma.post.delete({ where: { id } });
    return { success: true };
  }

  async approve(
    user: AuthUser,
    id: string,
    action: 'APPROVED' | 'REJECTED' | 'REGENERATE',
    feedback?: string,
  ) {
    const post = await this.prisma.post.findFirst({
      where: { id, organizationId: user.organizationId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    let newState: PostState;
    switch (action) {
      case 'APPROVED':
        newState = PostState.APPROVED;
        break;
      case 'REJECTED':
        newState = PostState.REJECTED;
        break;
      case 'REGENERATE':
        newState = PostState.DRAFT;
        break;
      default:
        throw new BadRequestException(`Invalid action: ${action}`);
    }

    if (!canTransition(post.state, newState)) {
      throw new BadRequestException(
        `Cannot transition from ${post.state} to ${newState}`,
      );
    }

    // Create approval record
    await this.prisma.postApproval.create({
      data: {
        postId: id,
        userId: user.id,
        action,
        feedback: feedback || null,
      },
    });

    // Update post state
    const updated = await this.prisma.post.update({
      where: { id },
      data: {
        state: newState,
        // Auto-schedule approved posts that already have a publishDate
        ...(newState === PostState.APPROVED && post.publishDate
          ? { state: PostState.SCHEDULED }
          : {}),
      },
      include: {
        integration: { select: { id: true, platform: true, name: true } },
        approvals: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    return updated;
  }

  async bulkApprove(
    user: AuthUser,
    postIds: string[],
    action: 'APPROVED' | 'REJECTED' | 'REGENERATE',
  ) {
    const results = [];

    for (const postId of postIds) {
      try {
        const result = await this.approve(user, postId, action);
        results.push({ postId, success: true, state: result.state });
      } catch (error) {
        results.push({
          postId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { results };
  }

  async regenerate(organizationId: string, id: string, feedback?: string) {
    const post = await this.prisma.post.findFirst({
      where: { id, organizationId },
      include: {
        versions: { orderBy: { version: 'desc' }, take: 1 },
        postMedia: true,
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const nextVersion = (post.versions[0]?.version ?? 0) + 1;

    // Create new version record from current content
    await this.prisma.postVersion.create({
      data: {
        postId: id,
        version: nextVersion,
        content: post.content,
        mediaIds: post.postMedia.map((pm) => pm.mediaId),
        feedback: feedback || null,
      },
    });

    // Update post metadata to indicate regeneration was requested
    const updated = await this.prisma.post.update({
      where: { id },
      data: {
        state: PostState.DRAFT,
        regenerationCount: { increment: 1 },
      },
      include: {
        versions: { orderBy: { version: 'desc' } },
        integration: { select: { id: true, platform: true, name: true } },
      },
    });

    return updated;
  }

  async getVersions(organizationId: string, id: string) {
    const post = await this.prisma.post.findFirst({
      where: { id, organizationId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return this.prisma.postVersion.findMany({
      where: { postId: id },
      orderBy: { version: 'desc' },
    });
  }

  async reschedule(organizationId: string, id: string, publishDate: string) {
    const post = await this.prisma.post.findFirst({
      where: { id, organizationId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const reschedulableStates: PostState[] = [
      PostState.DRAFT,
      PostState.APPROVED,
      PostState.SCHEDULED,
      PostState.AI_GENERATED,
      PostState.PENDING_APPROVAL,
    ];
    if (!reschedulableStates.includes(post.state)) {
      throw new BadRequestException(`Cannot reschedule post in state ${post.state}`);
    }

    const newDate = new Date(publishDate);
    if (newDate <= new Date()) {
      throw new BadRequestException('Publish date must be in the future');
    }

    // If post is approved, transition to scheduled
    let newState = post.state;
    if (post.state === PostState.APPROVED) {
      newState = PostState.SCHEDULED;
    }

    return this.prisma.post.update({
      where: { id },
      data: {
        publishDate: newDate,
        state: newState,
      },
      include: {
        integration: { select: { id: true, platform: true, name: true } },
      },
    });
  }
}
