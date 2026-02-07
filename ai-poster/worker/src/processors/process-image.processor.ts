import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import { PrismaService } from '../worker.module';
import {
  PROCESS_IMAGE_QUEUE,
  ProcessImageJobData,
} from '../queues/process-image.queue';
import { PLATFORM_LIMITS } from '@ai-poster/shared/constants/platform-limits';
import { Platform } from '@ai-poster/shared/types/platform.types';

@Processor(PROCESS_IMAGE_QUEUE)
export class ProcessImageProcessor extends WorkerHost {
  private readonly logger = new Logger(ProcessImageProcessor.name);
  private openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    super();
    this.openai = new OpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY'),
    });
  }

  async process(job: Job<ProcessImageJobData>): Promise<void> {
    const { mediaId, organizationId, campaignId, templateId } = job.data;
    this.logger.log(
      `Processing process-image job ${job.id} | media=${mediaId} campaign=${campaignId}`,
    );

    try {
      // ── Step 1: Load media file and template from DB ──
      const media = await this.prisma.media.findUnique({
        where: { id: mediaId },
      });

      if (!media) {
        this.logger.error(`Media ${mediaId} not found, skipping`);
        return;
      }

      const campaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          channels: { include: { integration: true } },
        },
      });

      if (!campaign) {
        this.logger.error(`Campaign ${campaignId} not found, skipping`);
        return;
      }

      const resolvedTemplateId = templateId || campaign.templateId;
      let template: any = null;

      if (resolvedTemplateId) {
        template = await this.prisma.template.findUnique({
          where: { id: resolvedTemplateId },
          include: {
            platformOverrides: true,
          },
        });
      }

      const channels = campaign.channels.map((cc) => cc.integration);

      if (channels.length === 0) {
        this.logger.warn(
          `Campaign ${campaignId} has no channels, skipping image processing`,
        );
        return;
      }

      // ── Step 2: Send image to OpenAI Vision API for analysis ──
      const imageAnalysis = await this.analyzeImageWithVision(media.path);
      this.logger.log(
        `Image ${mediaId} analyzed: ${imageAnalysis.substring(0, 100)}...`,
      );

      await job.updateProgress(30);

      // ── Step 3: Generate platform-specific captions ──
      const posts: { channelId: string; content: string; platform: Platform }[] = [];

      for (const channel of channels) {
        const platform = channel.platform as Platform;
        const limits = PLATFORM_LIMITS[platform];

        // Find platform-specific overrides
        const override = template?.platformOverrides?.find(
          (po: any) => po.platform === platform,
        );

        const caption = await this.generateCaptionFromImageAnalysis(
          imageAnalysis,
          template,
          override,
          platform,
          limits?.maxChars ?? 2000,
        );

        posts.push({
          channelId: channel.id,
          content: caption,
          platform,
        });
      }

      await job.updateProgress(70);

      // ── Step 4: Create Post records (one per selected integration) ──
      const group = `img-${mediaId}-${Date.now()}`;

      for (const postData of posts) {
        await this.prisma.post.create({
          data: {
            organizationId,
            campaignId,
            integrationId: postData.channelId,
            templateId: resolvedTemplateId || undefined,
            group,
            content: postData.content,
            plainText: postData.content, // Vision-generated captions are plain text
            sourceType: 'AI_FROM_IMAGE',
            state: 'AI_GENERATED',
            sourceImages: {
              mediaId,
              analysis: imageAnalysis,
            },
            postMedia: {
              create: {
                mediaId,
                order: 0,
                altText: imageAnalysis.substring(0, 500),
              },
            },
          },
        });
      }

      await job.updateProgress(90);

      // ── Step 5: Mark CampaignAsset as processed ──
      await this.prisma.campaignAsset.updateMany({
        where: {
          campaignId,
          mediaId,
          processed: false,
        },
        data: {
          processed: true,
          extractedText: imageAnalysis,
        },
      });

      // ── Step 6: Send notification to user ──
      await this.prisma.notification.create({
        data: {
          userId: campaign.createdBy,
          organizationId,
          title: 'Image Processed',
          message: `${posts.length} caption(s) generated from image "${media.name}" for campaign "${campaign.name}". Review and approve them.`,
          type: 'success',
          link: `/campaigns/${campaignId}`,
        },
      });

      await job.updateProgress(100);

      this.logger.log(
        `Successfully processed image ${mediaId} and created ${posts.length} posts`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to process image ${mediaId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  // ─── OpenAI Vision Integration ─────────────────────────────────────

  private async analyzeImageWithVision(imagePath: string): Promise<string> {
    // Determine if the path is a URL or a local file path
    const isUrl =
      imagePath.startsWith('http://') || imagePath.startsWith('https://');

    const imageContent: OpenAI.ChatCompletionContentPart = isUrl
      ? {
          type: 'image_url',
          image_url: { url: imagePath, detail: 'high' },
        }
      : {
          type: 'image_url',
          image_url: {
            // For local files, use a base64 data URI
            // TODO: Read the file from disk and convert to base64
            url: imagePath,
            detail: 'high',
          },
        };

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this image in detail for social media post generation. Describe:\n1. Main objects and subjects\n2. Setting/environment\n3. Mood and atmosphere\n4. Colors and visual style\n5. Any visible text or branding\n6. Suggested themes for social media captions\n\nBe specific and detailed.',
            },
            imageContent,
          ],
        },
      ],
      max_tokens: 800,
    });

    const analysis = response.choices[0]?.message?.content?.trim();
    if (!analysis) {
      throw new Error('OpenAI Vision returned empty analysis');
    }
    return analysis;
  }

  private async generateCaptionFromImageAnalysis(
    imageAnalysis: string,
    template: any,
    platformOverride: any,
    platform: Platform,
    maxChars: number,
  ): Promise<string> {
    const parts: string[] = [];

    parts.push(
      `Generate a social media caption for ${platform} based on this image analysis:`,
      '',
      imageAnalysis,
      '',
      `Maximum character count: ${maxChars}.`,
    );

    if (template) {
      if (template.brandContext) {
        parts.push(`Brand context: ${template.brandContext}`);
      }
      if (template.targetAudience) {
        parts.push(`Target audience: ${template.targetAudience}`);
      }

      const tone = platformOverride?.toneOverride || template.tone;
      parts.push(`Tone: ${tone}`);
      parts.push(`Emoji usage: ${template.emojiUsage}`);
      parts.push(
        `Content length: ${platformOverride?.contentLengthOverride || template.contentLength}`,
      );

      const hashtagStrategy =
        platformOverride?.hashtagOverride?.length > 0
          ? `Use these hashtags: ${platformOverride.hashtagOverride.join(', ')}`
          : `Hashtag strategy: ${template.hashtagStrategy}`;
      parts.push(hashtagStrategy);

      if (template.defaultHashtags?.length > 0) {
        parts.push(
          `Default hashtags: ${template.defaultHashtags.join(', ')}`,
        );
      }

      if (template.ctaTemplate) {
        parts.push(
          `CTA: ${platformOverride?.customCta || template.ctaTemplate}`,
        );
      }

      if (template.dos?.length > 0) {
        parts.push(`Do: ${template.dos.join('; ')}`);
      }
      if (template.donts?.length > 0) {
        parts.push(`Don't: ${template.donts.join('; ')}`);
      }

      if (platformOverride?.additionalInstructions) {
        parts.push(
          `Additional instructions: ${platformOverride.additionalInstructions}`,
        );
      }
    }

    parts.push(
      '',
      'Return ONLY the caption text, no additional commentary.',
    );

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are a professional social media content creator specializing in image-based posts. Generate engaging captions that complement visual content. Return only the caption text.',
        },
        { role: 'user', content: parts.join('\n') },
      ],
      max_tokens: 500,
      temperature: 0.8,
    });

    const caption = response.choices[0]?.message?.content?.trim();
    if (!caption) {
      throw new Error('OpenAI returned empty caption');
    }
    return caption;
  }
}
