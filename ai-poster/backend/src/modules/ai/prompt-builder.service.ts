import { Injectable } from '@nestjs/common';

/**
 * Platform character limits and recommendations.
 */
const PLATFORM_LIMITS: Record<
  string,
  { maxChars: number; hashtagLimit: number; notes: string }
> = {
  TWITTER: {
    maxChars: 280,
    hashtagLimit: 3,
    notes: 'Keep it concise. Threads supported. Images boost engagement.',
  },
  LINKEDIN: {
    maxChars: 3000,
    hashtagLimit: 5,
    notes:
      'Professional tone. First 2 lines critical (before "see more"). Use line breaks for readability.',
  },
  LINKEDIN_PAGE: {
    maxChars: 3000,
    hashtagLimit: 5,
    notes:
      'Company page content. Professional tone. Articles and thought leadership perform well.',
  },
  FACEBOOK: {
    maxChars: 63206,
    hashtagLimit: 3,
    notes:
      'Conversational tone. Questions and stories drive engagement. Short posts (under 80 chars) get more engagement.',
  },
  INSTAGRAM: {
    maxChars: 2200,
    hashtagLimit: 30,
    notes:
      'Visual-first platform. Caption supports the image. First line is the hook. Hashtags can go in first comment.',
  },
  YOUTUBE: {
    maxChars: 5000,
    hashtagLimit: 15,
    notes:
      'Video descriptions. Include timestamps, links, and keywords. First 200 chars appear in search.',
  },
  TIKTOK: {
    maxChars: 2200,
    hashtagLimit: 5,
    notes:
      'Trendy, casual tone. Short and catchy. Trending sounds and hashtags matter.',
  },
  REDDIT: {
    maxChars: 40000,
    hashtagLimit: 0,
    notes:
      'No hashtags. Community-focused. Authentic voice. Follow subreddit rules. Value-first approach.',
  },
  PINTEREST: {
    maxChars: 500,
    hashtagLimit: 20,
    notes:
      'SEO-focused descriptions. Keywords matter. Actionable and aspirational content.',
  },
  THREADS: {
    maxChars: 500,
    hashtagLimit: 0,
    notes: 'Conversational and casual. Similar to Twitter but more relaxed.',
  },
  DISCORD: {
    maxChars: 2000,
    hashtagLimit: 0,
    notes:
      'Community-focused. Can use markdown formatting. Casual and interactive.',
  },
  SLACK: {
    maxChars: 40000,
    hashtagLimit: 0,
    notes: 'Professional but conversational. Markdown supported. Be concise.',
  },
  MASTODON: {
    maxChars: 500,
    hashtagLimit: 5,
    notes:
      'Similar to Twitter. CamelCase hashtags for accessibility. Alt text for images is valued.',
  },
  BLUESKY: {
    maxChars: 300,
    hashtagLimit: 3,
    notes: 'Concise like Twitter. Growing platform. Authentic content preferred.',
  },
  DRIBBBLE: {
    maxChars: 2000,
    hashtagLimit: 10,
    notes: 'Design-focused platform. Showcase creative work. Technical and aesthetic descriptions.',
  },
};

interface TemplateData {
  name: string;
  brandContext?: string | null;
  targetAudience?: string | null;
  tone: string;
  language: string;
  goals: string[];
  dos: string[];
  donts: string[];
  inspirationTexts: string[];
  examplePosts: string[];
  defaultHashtags: string[];
  hashtagStrategy: string;
  ctaTemplate?: string | null;
  postStructure: string;
  emojiUsage: string;
  contentLength: string;
  imageStyle?: string | null;
}

interface PlatformOverrideData {
  platform: string;
  toneOverride?: string | null;
  hashtagOverride: string[];
  contentLengthOverride?: string | null;
  additionalInstructions?: string | null;
  postTypePreference?: string | null;
  customCta?: string | null;
}

@Injectable()
export class PromptBuilderService {
  /**
   * Build a comprehensive system prompt from a Template, optional PlatformOverride,
   * and platform limits.
   */
  buildPromptFromTemplate(
    template: TemplateData,
    platformOverride?: PlatformOverrideData,
    platform?: string,
  ): string {
    const sections: string[] = [];

    // Role and context
    sections.push(
      '# Social Media Content Generator',
      '',
      `You are an expert social media content creator for the brand/context described below. Your job is to create engaging, on-brand content.`,
    );

    // Brand context
    if (template.brandContext) {
      sections.push('', '## Brand Context', template.brandContext);
    }

    // Target audience
    if (template.targetAudience) {
      sections.push('', '## Target Audience', template.targetAudience);
    }

    // Tone
    const effectiveTone =
      platformOverride?.toneOverride || template.tone;
    sections.push(
      '',
      '## Tone & Voice',
      `Write in a ${effectiveTone.toLowerCase()} tone.`,
    );

    // Language
    sections.push(`Language: ${template.language}`);

    // Content structure
    sections.push(
      '',
      '## Content Structure',
      `Preferred structure: ${this.formatStructure(template.postStructure)}`,
    );

    // Content length
    const effectiveLength =
      platformOverride?.contentLengthOverride || template.contentLength;
    const lengthGuide: Record<string, string> = {
      SHORT: 'Keep it brief and punchy (1-3 sentences).',
      MEDIUM: 'Medium length for substance with readability (3-6 sentences).',
      LONG: 'Detailed and comprehensive (6+ sentences, use paragraphs).',
    };
    sections.push(
      `Content length: ${effectiveLength} - ${lengthGuide[effectiveLength] || lengthGuide.MEDIUM}`,
    );

    // Emoji usage
    const emojiGuide: Record<string, string> = {
      NONE: 'Do NOT use any emojis.',
      MINIMAL: 'Use emojis sparingly (0-2 per post).',
      MODERATE: 'Use emojis to enhance key points (3-5 per post).',
      HEAVY: 'Use emojis liberally throughout the content.',
    };
    sections.push(
      emojiGuide[template.emojiUsage] || emojiGuide.MINIMAL,
    );

    // Goals
    if (template.goals.length > 0) {
      sections.push(
        '',
        '## Goals',
        ...template.goals.map((g) => `- ${g}`),
      );
    }

    // DOs
    if (template.dos.length > 0) {
      sections.push(
        '',
        '## DO (Always follow these guidelines)',
        ...template.dos.map((d) => `- ${d}`),
      );
    }

    // DON'Ts
    if (template.donts.length > 0) {
      sections.push(
        '',
        "## DON'T (Never do these)",
        ...template.donts.map((d) => `- ${d}`),
      );
    }

    // Hashtag strategy
    const effectiveHashtags =
      platformOverride?.hashtagOverride?.length
        ? platformOverride.hashtagOverride
        : template.defaultHashtags;

    if (template.hashtagStrategy !== 'NONE') {
      sections.push('', '## Hashtag Strategy');
      const hashtagGuide: Record<string, string> = {
        MINIMAL: 'Use 1-3 highly relevant hashtags.',
        MODERATE: 'Use 3-7 relevant hashtags mixing popular and niche.',
        AGGRESSIVE:
          'Maximize hashtag usage for discoverability (up to platform limit).',
      };
      sections.push(
        hashtagGuide[template.hashtagStrategy] || hashtagGuide.MODERATE,
      );
      if (effectiveHashtags.length > 0) {
        sections.push(
          `Preferred hashtags to include when relevant: ${effectiveHashtags.map((h) => `#${h}`).join(' ')}`,
        );
      }
    } else {
      sections.push('', 'Do NOT include any hashtags.');
    }

    // CTA
    const effectiveCta =
      platformOverride?.customCta || template.ctaTemplate;
    if (effectiveCta) {
      sections.push(
        '',
        '## Call to Action',
        `Include a CTA based on this template: "${effectiveCta}"`,
      );
    }

    // Inspiration/examples
    if (template.inspirationTexts.length > 0) {
      sections.push(
        '',
        '## Inspiration & Style Reference',
        'Use these examples as style reference (do not copy directly):',
        ...template.inspirationTexts.map(
          (t, i) => `\nExample ${i + 1}:\n${t}`,
        ),
      );
    }

    if (template.examplePosts.length > 0) {
      sections.push(
        '',
        '## Example Posts (match this style)',
        ...template.examplePosts.map(
          (p, i) => `\nExample ${i + 1}:\n${p}`,
        ),
      );
    }

    // Platform-specific section
    if (platform) {
      const limits = PLATFORM_LIMITS[platform];
      if (limits) {
        sections.push(
          '',
          `## Platform: ${platform}`,
          `- Maximum characters: ${limits.maxChars}`,
          `- Recommended hashtag limit: ${limits.hashtagLimit}`,
          `- Platform notes: ${limits.notes}`,
        );
      }

      // Platform override additional instructions
      if (platformOverride?.additionalInstructions) {
        sections.push(
          '',
          '## Additional Platform-Specific Instructions',
          platformOverride.additionalInstructions,
        );
      }

      // Post type preference
      if (platformOverride?.postTypePreference) {
        sections.push(
          `Preferred post type: ${platformOverride.postTypePreference}`,
        );
      }
    }

    // Image style guidance
    if (template.imageStyle) {
      sections.push(
        '',
        '## Image Style',
        `When describing or requesting images: ${template.imageStyle}`,
      );
    }

    // Output instruction
    sections.push(
      '',
      '## Output',
      'Generate the social media content based on the user prompt. Return ONLY the post content text, nothing else. Do not include quotation marks around the output.',
    );

    return sections.join('\n');
  }

  /**
   * Get platform limits for a given platform.
   */
  getPlatformLimits(platform: string) {
    return PLATFORM_LIMITS[platform] || null;
  }

  /**
   * Get all supported platform limits.
   */
  getAllPlatformLimits() {
    return PLATFORM_LIMITS;
  }

  private formatStructure(structure: string): string {
    const structureMap: Record<string, string> = {
      HOOK_BODY_CTA:
        'Hook (attention-grabbing opener) -> Body (main message) -> CTA (call to action)',
      QUESTION_ANSWER:
        'Start with a thought-provoking question, then provide the answer/insight',
      STORY:
        'Tell a short story or narrative that connects to the message',
      LIST_FORMAT:
        'Present content as a numbered or bulleted list',
      QUOTE:
        'Lead with or center around a powerful quote or statement',
      COMPARISON:
        'Compare/contrast two ideas, before/after, or myth vs reality',
      HOW_TO:
        'Step-by-step instructional format',
      FREE_FORM:
        'No specific structure required, write naturally',
    };
    return structureMap[structure] || structureMap.FREE_FORM;
  }
}
