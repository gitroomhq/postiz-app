import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database.module';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string) {
    return this.prisma.template.findMany({
      where: {
        OR: [{ organizationId }, { isGlobal: true }],
      },
      include: {
        creator: { select: { id: true, name: true } },
        platformOverrides: true,
        _count: {
          select: { campaigns: true, posts: true, inspirationImages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async create(
    user: AuthUser,
    data: {
      name: string;
      description?: string;
      category?: string;
      brandContext?: string;
      targetAudience?: string;
      tone?: string;
      language?: string;
      goals?: string[];
      dos?: string[];
      donts?: string[];
      inspirationTexts?: string[];
      referenceUrls?: string[];
      examplePosts?: string[];
      defaultHashtags?: string[];
      hashtagStrategy?: string;
      ctaTemplate?: string;
      postStructure?: string;
      emojiUsage?: string;
      contentLength?: string;
      imageStyle?: string;
      preferUserImages?: boolean;
      imageOverlayText?: boolean;
    },
  ) {
    return this.prisma.template.create({
      data: {
        organizationId: user.organizationId,
        createdBy: user.id,
        name: data.name,
        description: data.description || null,
        category: (data.category as any) || 'CUSTOM',
        brandContext: data.brandContext || null,
        targetAudience: data.targetAudience || null,
        tone: (data.tone as any) || 'PROFESSIONAL',
        language: data.language || 'en',
        goals: data.goals || [],
        dos: data.dos || [],
        donts: data.donts || [],
        inspirationTexts: data.inspirationTexts || [],
        referenceUrls: data.referenceUrls || [],
        examplePosts: data.examplePosts || [],
        defaultHashtags: data.defaultHashtags || [],
        hashtagStrategy: (data.hashtagStrategy as any) || 'MODERATE',
        ctaTemplate: data.ctaTemplate || null,
        postStructure: (data.postStructure as any) || 'HOOK_BODY_CTA',
        emojiUsage: (data.emojiUsage as any) || 'MINIMAL',
        contentLength: (data.contentLength as any) || 'MEDIUM',
        imageStyle: data.imageStyle || null,
        preferUserImages: data.preferUserImages ?? true,
        imageOverlayText: data.imageOverlayText ?? false,
      },
      include: {
        creator: { select: { id: true, name: true } },
        platformOverrides: true,
        inspirationImages: { include: { media: true } },
      },
    });
  }

  async detail(organizationId: string, id: string) {
    const template = await this.prisma.template.findFirst({
      where: {
        id,
        OR: [{ organizationId }, { isGlobal: true }],
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        platformOverrides: true,
        inspirationImages: {
          include: {
            media: {
              select: {
                id: true,
                name: true,
                path: true,
                type: true,
                thumbnail: true,
              },
            },
          },
        },
        _count: { select: { campaigns: true, posts: true } },
      },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async update(
    organizationId: string,
    id: string,
    data: {
      name?: string;
      description?: string;
      category?: string;
      brandContext?: string;
      targetAudience?: string;
      tone?: string;
      language?: string;
      goals?: string[];
      dos?: string[];
      donts?: string[];
      inspirationTexts?: string[];
      referenceUrls?: string[];
      examplePosts?: string[];
      defaultHashtags?: string[];
      hashtagStrategy?: string;
      ctaTemplate?: string;
      postStructure?: string;
      emojiUsage?: string;
      contentLength?: string;
      imageStyle?: string;
      preferUserImages?: boolean;
      imageOverlayText?: boolean;
    },
  ) {
    const template = await this.prisma.template.findFirst({
      where: { id, organizationId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    const updateData: any = {};
    const directFields = [
      'name',
      'description',
      'brandContext',
      'targetAudience',
      'language',
      'ctaTemplate',
      'imageStyle',
    ];
    for (const field of directFields) {
      if (data[field as keyof typeof data] !== undefined) {
        updateData[field] = data[field as keyof typeof data];
      }
    }

    // Enum fields
    const enumFields = [
      'category',
      'tone',
      'hashtagStrategy',
      'postStructure',
      'emojiUsage',
      'contentLength',
    ];
    for (const field of enumFields) {
      if (data[field as keyof typeof data] !== undefined) {
        updateData[field] = data[field as keyof typeof data];
      }
    }

    // Array fields
    const arrayFields = [
      'goals',
      'dos',
      'donts',
      'inspirationTexts',
      'referenceUrls',
      'examplePosts',
      'defaultHashtags',
    ];
    for (const field of arrayFields) {
      if (data[field as keyof typeof data] !== undefined) {
        updateData[field] = data[field as keyof typeof data];
      }
    }

    // Boolean fields
    if (data.preferUserImages !== undefined) updateData.preferUserImages = data.preferUserImages;
    if (data.imageOverlayText !== undefined) updateData.imageOverlayText = data.imageOverlayText;

    return this.prisma.template.update({
      where: { id },
      data: updateData,
      include: {
        creator: { select: { id: true, name: true } },
        platformOverrides: true,
        inspirationImages: { include: { media: true } },
      },
    });
  }

  async remove(organizationId: string, id: string) {
    const template = await this.prisma.template.findFirst({
      where: { id, organizationId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    await this.prisma.template.delete({ where: { id } });
    return { success: true };
  }

  async duplicate(user: AuthUser, id: string) {
    const source = await this.prisma.template.findFirst({
      where: {
        id,
        OR: [{ organizationId: user.organizationId }, { isGlobal: true }],
      },
      include: {
        platformOverrides: true,
        inspirationImages: true,
      },
    });

    if (!source) {
      throw new NotFoundException('Template not found');
    }

    const duplicate = await this.prisma.template.create({
      data: {
        organizationId: user.organizationId,
        createdBy: user.id,
        name: `${source.name} (Copy)`,
        description: source.description,
        category: source.category,
        brandContext: source.brandContext,
        targetAudience: source.targetAudience,
        tone: source.tone,
        language: source.language,
        goals: source.goals,
        dos: source.dos,
        donts: source.donts,
        inspirationTexts: source.inspirationTexts,
        referenceUrls: source.referenceUrls,
        examplePosts: source.examplePosts,
        defaultHashtags: source.defaultHashtags,
        hashtagStrategy: source.hashtagStrategy,
        ctaTemplate: source.ctaTemplate,
        postStructure: source.postStructure,
        emojiUsage: source.emojiUsage,
        contentLength: source.contentLength,
        imageStyle: source.imageStyle,
        preferUserImages: source.preferUserImages,
        imageOverlayText: source.imageOverlayText,
      },
    });

    // Copy platform overrides
    if (source.platformOverrides.length > 0) {
      await this.prisma.templatePlatformOverride.createMany({
        data: source.platformOverrides.map((override) => ({
          templateId: duplicate.id,
          platform: override.platform,
          toneOverride: override.toneOverride,
          hashtagOverride: override.hashtagOverride,
          contentLengthOverride: override.contentLengthOverride,
          additionalInstructions: override.additionalInstructions,
          postTypePreference: override.postTypePreference,
          customCta: override.customCta,
        })),
      });
    }

    // Copy inspiration images
    if (source.inspirationImages.length > 0) {
      await this.prisma.templateInspirationImage.createMany({
        data: source.inspirationImages.map((img) => ({
          templateId: duplicate.id,
          mediaId: img.mediaId,
          description: img.description,
        })),
      });
    }

    return this.detail(user.organizationId, duplicate.id);
  }

  async setPlatformOverride(
    organizationId: string,
    templateId: string,
    platform: string,
    data: {
      toneOverride?: string;
      hashtagOverride?: string[];
      contentLengthOverride?: string;
      additionalInstructions?: string;
      postTypePreference?: string;
      customCta?: string;
    },
  ) {
    const template = await this.prisma.template.findFirst({
      where: { id: templateId, organizationId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Upsert the platform override
    const existing = await this.prisma.templatePlatformOverride.findUnique({
      where: {
        templateId_platform: {
          templateId,
          platform: platform as any,
        },
      },
    });

    if (existing) {
      return this.prisma.templatePlatformOverride.update({
        where: { id: existing.id },
        data: {
          toneOverride: data.toneOverride as any,
          hashtagOverride: data.hashtagOverride,
          contentLengthOverride: data.contentLengthOverride as any,
          additionalInstructions: data.additionalInstructions,
          postTypePreference: data.postTypePreference,
          customCta: data.customCta,
        },
      });
    }

    return this.prisma.templatePlatformOverride.create({
      data: {
        templateId,
        platform: platform as any,
        toneOverride: data.toneOverride as any,
        hashtagOverride: data.hashtagOverride || [],
        contentLengthOverride: data.contentLengthOverride as any,
        additionalInstructions: data.additionalInstructions || null,
        postTypePreference: data.postTypePreference || null,
        customCta: data.customCta || null,
      },
    });
  }

  async addInspirationImage(
    organizationId: string,
    templateId: string,
    mediaId: string,
    description?: string,
  ) {
    const template = await this.prisma.template.findFirst({
      where: { id: templateId, organizationId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Verify media belongs to the org
    const media = await this.prisma.media.findFirst({
      where: { id: mediaId, organizationId, deletedAt: null },
    });

    if (!media) {
      throw new BadRequestException('Media not found');
    }

    return this.prisma.templateInspirationImage.create({
      data: {
        templateId,
        mediaId,
        description: description || null,
      },
      include: {
        media: {
          select: { id: true, name: true, path: true, type: true, thumbnail: true },
        },
      },
    });
  }

  async removeInspirationImage(
    organizationId: string,
    templateId: string,
    imageId: string,
  ) {
    const template = await this.prisma.template.findFirst({
      where: { id: templateId, organizationId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    const image = await this.prisma.templateInspirationImage.findFirst({
      where: { id: imageId, templateId },
    });

    if (!image) {
      throw new NotFoundException('Inspiration image not found');
    }

    await this.prisma.templateInspirationImage.delete({
      where: { id: imageId },
    });

    return { success: true };
  }
}
