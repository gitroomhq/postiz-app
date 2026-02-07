import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database.module';
import { PromptBuilderService } from './prompt-builder.service';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly promptBuilder: PromptBuilderService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async generateText(
    organizationId: string,
    data: {
      prompt: string;
      templateId?: string;
      platform?: string;
      integrationId?: string;
    },
  ) {
    let systemPrompt =
      'You are a social media content expert. Generate engaging, platform-optimized content.';

    // Build system prompt from template if provided
    if (data.templateId) {
      const template = await this.prisma.template.findFirst({
        where: {
          id: data.templateId,
          OR: [{ organizationId }, { isGlobal: true }],
        },
        include: { platformOverrides: true },
      });

      if (!template) {
        throw new NotFoundException('Template not found');
      }

      const platformOverride = data.platform
        ? template.platformOverrides.find(
            (o) => o.platform === data.platform,
          )
        : undefined;

      systemPrompt = this.promptBuilder.buildPromptFromTemplate(
        template,
        platformOverride || undefined,
        data.platform,
      );
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: data.prompt },
        ],
        temperature: 0.8,
        max_tokens: 2000,
      });

      const generatedText = completion.choices[0]?.message?.content || '';

      return {
        text: generatedText,
        model: 'gpt-4.1',
        usage: completion.usage,
        templateId: data.templateId || null,
        platform: data.platform || null,
      };
    } catch (error) {
      this.logger.error('OpenAI text generation failed', error);
      throw new InternalServerErrorException('AI text generation failed');
    }
  }

  async generateImage(
    organizationId: string,
    data: {
      prompt: string;
      style?: string;
      aspectRatio?: string;
    },
  ) {
    const sizeMap: Record<string, '1024x1024' | '1792x1024' | '1024x1792'> = {
      square: '1024x1024',
      landscape: '1792x1024',
      portrait: '1024x1792',
      '1:1': '1024x1024',
      '16:9': '1792x1024',
      '9:16': '1024x1792',
    };

    const size = sizeMap[data.aspectRatio || 'square'] || '1024x1024';

    try {
      const response = await this.openai.images.generate({
        model: 'dall-e-3',
        prompt: data.style
          ? `${data.prompt}. Style: ${data.style}`
          : data.prompt,
        n: 1,
        size,
        quality: 'hd',
      });

      const imageUrl = response.data[0]?.url;
      const revisedPrompt = response.data[0]?.revised_prompt;

      return {
        imageUrl,
        revisedPrompt,
        model: 'dall-e-3',
        size,
        style: data.style || null,
      };
    } catch (error) {
      this.logger.error('DALL-E image generation failed', error);
      throw new InternalServerErrorException('AI image generation failed');
    }
  }

  async analyzeImage(organizationId: string, mediaId: string) {
    const media = await this.prisma.media.findFirst({
      where: { id: mediaId, organizationId, deletedAt: null },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    // Construct a URL or base64 payload for the image
    // In production, this would be a full URL to the stored image
    const imageUrl = media.path.startsWith('http')
      ? media.path
      : `${this.configService.get<string>('APP_URL', 'http://localhost:3001')}/uploads/${media.path}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this image in detail. Describe:\n1. Main subject and composition\n2. Colors and mood\n3. Text if present (OCR)\n4. Suggested social media caption ideas\n5. Relevant hashtag suggestions\n6. Best platforms for this type of image',
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl, detail: 'high' },
              },
            ],
          },
        ],
        max_tokens: 1500,
      });

      const analysis = response.choices[0]?.message?.content || '';

      return {
        mediaId,
        analysis,
        model: 'gpt-4.1',
        usage: response.usage,
      };
    } catch (error) {
      this.logger.error('Vision API analysis failed', error);
      throw new InternalServerErrorException('AI image analysis failed');
    }
  }

  async extractUrl(url: string) {
    if (!url || !url.startsWith('http')) {
      throw new BadRequestException('A valid URL is required');
    }

    try {
      // Fetch URL content
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; AIPosterBot/1.0; +https://postiz.com)',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new BadRequestException(`Failed to fetch URL: ${response.status}`);
      }

      const html = await response.text();

      // Use AI to extract and summarize the content
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
          {
            role: 'system',
            content:
              'You are a content extraction assistant. Extract the main content from the provided HTML. Return a JSON object with: title, summary (2-3 sentences), keyPoints (array of 3-5 points), suggestedTopics (array), and mainContent (cleaned text, max 500 words).',
          },
          {
            role: 'user',
            content: `Extract content from this HTML:\n\n${html.substring(0, 15000)}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const extracted = completion.choices[0]?.message?.content || '{}';
      let parsed;
      try {
        parsed = JSON.parse(extracted);
      } catch {
        parsed = { rawText: extracted };
      }

      return {
        url,
        ...parsed,
        model: 'gpt-4.1',
        usage: completion.usage,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('URL extraction failed', error);
      throw new InternalServerErrorException('Failed to extract URL content');
    }
  }

  async improveText(
    organizationId: string,
    data: {
      text: string;
      instructions?: string;
      templateId?: string;
    },
  ) {
    let systemPrompt =
      'You are a social media copywriting expert. Improve the given text for better engagement, clarity, and impact. Preserve the core message and intent.';

    if (data.templateId) {
      const template = await this.prisma.template.findFirst({
        where: {
          id: data.templateId,
          OR: [{ organizationId }, { isGlobal: true }],
        },
        include: { platformOverrides: true },
      });

      if (template) {
        systemPrompt = this.promptBuilder.buildPromptFromTemplate(template);
        systemPrompt +=
          '\n\nYour task is to IMPROVE the following text while adhering to the template guidelines above.';
      }
    }

    if (data.instructions) {
      systemPrompt += `\n\nAdditional instructions: ${data.instructions}`;
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Improve this text:\n\n${data.text}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const improvedText = completion.choices[0]?.message?.content || '';

      return {
        original: data.text,
        improved: improvedText,
        model: 'gpt-4.1',
        usage: completion.usage,
      };
    } catch (error) {
      this.logger.error('Text improvement failed', error);
      throw new InternalServerErrorException('AI text improvement failed');
    }
  }

  async generateHashtags(data: {
    text: string;
    platform?: string;
    count?: number;
  }) {
    const count = data.count || 10;

    const platformContext = data.platform
      ? `Optimize for ${data.platform}. `
      : '';

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
          {
            role: 'system',
            content: `You are a social media hashtag strategist. ${platformContext}Generate relevant hashtags that maximize reach and engagement. Return a JSON object with: hashtags (array of strings without # prefix), categories (object grouping hashtags by type like "niche", "trending", "branded").`,
          },
          {
            role: 'user',
            content: `Generate ${count} hashtags for this content:\n\n${data.text}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const result = completion.choices[0]?.message?.content || '{}';
      let parsed;
      try {
        parsed = JSON.parse(result);
      } catch {
        parsed = { hashtags: [] };
      }

      return {
        ...parsed,
        platform: data.platform || null,
        model: 'gpt-4.1',
        usage: completion.usage,
      };
    } catch (error) {
      this.logger.error('Hashtag generation failed', error);
      throw new InternalServerErrorException('AI hashtag generation failed');
    }
  }
}
