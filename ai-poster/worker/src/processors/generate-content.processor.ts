import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';

import { PrismaService } from '../worker.module';
import {
  GENERATE_CONTENT_QUEUE,
  GenerateContentJobData,
} from '../queues/generate-content.queue';
import { PLATFORM_LIMITS } from '@ai-poster/shared/constants/platform-limits';
import { Platform } from '@ai-poster/shared/types/platform.types';

dayjs.extend(utc);

@Processor(GENERATE_CONTENT_QUEUE)
export class GenerateContentProcessor extends WorkerHost {
  private readonly logger = new Logger(GenerateContentProcessor.name);
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

  async process(job: Job<GenerateContentJobData>): Promise<void> {
    const { campaignId, organizationId, templateId, topics } = job.data;
    this.logger.log(
      `Processing generate-content job ${job.id} | campaign=${campaignId}`,
    );

    try {
      // ── Step 1: Load campaign, template, channels from DB ──
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
        this.logger.warn(`Campaign ${campaignId} has no channels, skipping`);
        return;
      }

      // ── Step 2: Calculate date slots ──
      const dateSlots = this.calculateDateSlots(
        new Date(campaign.startDate),
        new Date(campaign.endDate),
        campaign.postsPerWeek,
        campaign.preferredTimes,
      );

      this.logger.log(
        `Calculated ${dateSlots.length} date slots for campaign ${campaignId}`,
      );

      // ── Step 3: Generate content for each slot ──
      let slotIndex = 0;

      for (const slotDate of dateSlots) {
        // Distribute topics across slots (round-robin)
        const topic =
          topics && topics.length > 0
            ? topics[slotIndex % topics.length]
            : undefined;

        // Generate a post for each channel/integration in the campaign
        for (const channel of channels) {
          const platform = channel.platform as Platform;
          const limits = PLATFORM_LIMITS[platform];

          // Find platform-specific overrides
          const override = template?.platformOverrides?.find(
            (po: any) => po.platform === platform,
          );

          // ── Call OpenAI to generate content text ──
          const prompt = this.buildPrompt(
            template,
            override,
            platform,
            limits?.maxChars ?? 2000,
            topic,
          );

          const generatedText = await this.generateTextWithOpenAI(prompt);

          // ── If template has image generation enabled, call DALL-E ──
          let generatedMediaId: string | undefined;

          if (template?.imageStyle && !template?.preferUserImages) {
            try {
              const imageUrl = await this.generateImageWithDalle(
                generatedText,
                template.imageStyle,
              );

              // Create a Media record for the generated image
              const media = await this.prisma.media.create({
                data: {
                  organizationId,
                  name: `ai-generated-${campaignId}-${slotIndex}-${platform}`,
                  path: imageUrl,
                  type: 'IMAGE',
                  fileSize: 0, // Will be updated when downloaded
                  mimeType: 'image/png',
                  aiGenerated: true,
                },
              });

              generatedMediaId = media.id;
            } catch (imgError) {
              this.logger.warn(
                `Failed to generate image for slot ${slotIndex}: ${imgError}`,
              );
              // Continue without image - content is still usable
            }
          }

          // ── Create Post record with state AI_GENERATED ──
          const post = await this.prisma.post.create({
            data: {
              organizationId,
              campaignId,
              integrationId: channel.id,
              templateId: resolvedTemplateId || undefined,
              content: generatedText,
              plainText: this.stripHtml(generatedText),
              sourceType: 'AI_FULL',
              state: 'AI_GENERATED',
              publishDate: slotDate,
              aiPromptUsed: prompt,
              ...(generatedMediaId
                ? {
                    postMedia: {
                      create: {
                        mediaId: generatedMediaId,
                        order: 0,
                      },
                    },
                  }
                : {}),
            },
          });

          // ── Create CalendarSlot record linking to post ──
          await this.prisma.calendarSlot.create({
            data: {
              campaignId,
              organizationId,
              date: slotDate,
              integrationId: channel.id,
              topic: topic || null,
              status: 'FILLED',
              postId: post.id,
            },
          });

          await job.updateProgress(
            Math.round(
              ((slotIndex * channels.length + channels.indexOf(channel) + 1) /
                (dateSlots.length * channels.length)) *
                100,
            ),
          );
        }

        slotIndex++;
      }

      // ── Step 4: Update campaign status to ACTIVE ──
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'ACTIVE' },
      });

      // ── Step 5: Send notification to user ──
      await this.prisma.notification.create({
        data: {
          userId: campaign.createdBy,
          organizationId,
          title: 'Content Generation Complete',
          message: `${dateSlots.length * channels.length} posts have been generated for campaign "${campaign.name}". Review and approve them to start publishing.`,
          type: 'success',
          link: `/campaigns/${campaignId}`,
        },
      });

      this.logger.log(
        `Successfully generated ${dateSlots.length * channels.length} posts for campaign ${campaignId}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to generate content for campaign ${campaignId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  // ─── Date Slot Calculation ─────────────────────────────────────────

  private calculateDateSlots(
    startDate: Date,
    endDate: Date,
    postsPerWeek: number,
    preferredTimes: number[],
  ): Date[] {
    const slots: Date[] = [];
    const start = dayjs.utc(startDate);
    const end = dayjs.utc(endDate);
    const totalWeeks = end.diff(start, 'week', true);
    const totalPosts = Math.ceil(totalWeeks * postsPerWeek);

    // Distribute posts evenly across the date range
    const daysBetweenPosts =
      postsPerWeek > 0 ? 7 / postsPerWeek : 7;

    // Default preferred times if none provided: 9am, 12pm, 5pm UTC
    const times =
      preferredTimes.length > 0
        ? preferredTimes
        : [540, 720, 1020]; // minutes from midnight

    let currentDate = start;
    let postCount = 0;

    while (currentDate.isBefore(end) && postCount < totalPosts) {
      // Pick a preferred time (round-robin through available times)
      const timeMinutes = times[postCount % times.length];
      const hours = Math.floor(timeMinutes / 60);
      const minutes = timeMinutes % 60;

      const slotDate = currentDate
        .startOf('day')
        .add(hours, 'hour')
        .add(minutes, 'minute');

      // Only add if the slot is in the future
      if (slotDate.isAfter(dayjs.utc())) {
        slots.push(slotDate.toDate());
      }

      currentDate = currentDate.add(daysBetweenPosts, 'day');
      postCount++;
    }

    return slots;
  }

  // ─── OpenAI Integration ────────────────────────────────────────────

  private buildPrompt(
    template: any,
    platformOverride: any,
    platform: Platform,
    maxChars: number,
    topic?: string,
  ): string {
    const parts: string[] = [];

    parts.push(
      `Generate a social media post for ${platform}.`,
      `Maximum character count: ${maxChars}.`,
    );

    if (topic) {
      parts.push(`Topic: ${topic}`);
    }

    if (template) {
      if (template.brandContext) {
        parts.push(`Brand context: ${template.brandContext}`);
      }
      if (template.targetAudience) {
        parts.push(`Target audience: ${template.targetAudience}`);
      }

      const tone = platformOverride?.toneOverride || template.tone;
      parts.push(`Tone: ${tone}`);
      parts.push(`Post structure: ${template.postStructure}`);
      parts.push(`Emoji usage: ${template.emojiUsage}`);
      parts.push(`Content length: ${platformOverride?.contentLengthOverride || template.contentLength}`);

      const hashtagStrategy =
        platformOverride?.hashtagOverride?.length > 0
          ? `Use these hashtags: ${platformOverride.hashtagOverride.join(', ')}`
          : `Hashtag strategy: ${template.hashtagStrategy}`;
      parts.push(hashtagStrategy);

      if (template.defaultHashtags?.length > 0) {
        parts.push(
          `Default hashtags to consider: ${template.defaultHashtags.join(', ')}`,
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

      if (template.examplePosts?.length > 0) {
        parts.push(
          `Example posts for inspiration:\n${template.examplePosts.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n')}`,
        );
      }

      if (template.inspirationTexts?.length > 0) {
        parts.push(
          `Inspiration:\n${template.inspirationTexts.join('\n')}`,
        );
      }

      if (platformOverride?.additionalInstructions) {
        parts.push(
          `Additional platform instructions: ${platformOverride.additionalInstructions}`,
        );
      }
    }

    parts.push(
      '',
      'Return ONLY the post text, no additional commentary or formatting.',
    );

    return parts.join('\n');
  }

  private async generateTextWithOpenAI(prompt: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are a professional social media content creator. Generate engaging, platform-appropriate posts. Return only the post text with no additional commentary.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1000,
      temperature: 0.8,
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) {
      throw new Error('OpenAI returned empty content');
    }
    return text;
  }

  private async generateImageWithDalle(
    postContent: string,
    imageStyle: string,
  ): Promise<string> {
    const imagePrompt = `Create a social media image in ${imageStyle} style that complements this post: "${postContent.substring(0, 200)}"`;

    const response = await this.openai.images.generate({
      model: 'dall-e-3',
      prompt: imagePrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    });

    const imageUrl = response.data[0]?.url;
    if (!imageUrl) {
      throw new Error('DALL-E returned no image URL');
    }
    return imageUrl;
  }

  // ─── Helpers ───────────────────────────────────────────────────────

  private stripHtml(text: string): string {
    return text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
