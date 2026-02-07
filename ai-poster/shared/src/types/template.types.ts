import { Platform } from './platform.types';

export enum TemplateCategory {
  BRAND = 'BRAND',
  PRODUCT = 'PRODUCT',
  EVENT = 'EVENT',
  EDUCATIONAL = 'EDUCATIONAL',
  PROMOTIONAL = 'PROMOTIONAL',
  CUSTOM = 'CUSTOM',
}

export enum Tone {
  CASUAL = 'CASUAL',
  PROFESSIONAL = 'PROFESSIONAL',
  WITTY = 'WITTY',
  INSPIRATIONAL = 'INSPIRATIONAL',
  BOLD = 'BOLD',
  FRIENDLY = 'FRIENDLY',
  AUTHORITATIVE = 'AUTHORITATIVE',
  CONVERSATIONAL = 'CONVERSATIONAL',
}

export enum HashtagStrategy {
  NONE = 'NONE',
  MINIMAL = 'MINIMAL',
  MODERATE = 'MODERATE',
  AGGRESSIVE = 'AGGRESSIVE',
}

export enum PostStructureType {
  HOOK_BODY_CTA = 'HOOK_BODY_CTA',
  QUESTION_ANSWER = 'QUESTION_ANSWER',
  STORY = 'STORY',
  LIST_FORMAT = 'LIST_FORMAT',
  QUOTE = 'QUOTE',
  COMPARISON = 'COMPARISON',
  HOW_TO = 'HOW_TO',
  FREE_FORM = 'FREE_FORM',
}

export enum EmojiUsage {
  NONE = 'NONE',
  MINIMAL = 'MINIMAL',
  MODERATE = 'MODERATE',
  HEAVY = 'HEAVY',
}

export enum ContentLength {
  SHORT = 'SHORT',
  MEDIUM = 'MEDIUM',
  LONG = 'LONG',
}

export interface TemplateDto {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  isGlobal: boolean;
  brandContext?: string;
  targetAudience?: string;
  tone: Tone;
  language: string;
  goals: string[];
  dos: string[];
  donts: string[];
  inspirationTexts: string[];
  referenceUrls: string[];
  examplePosts: string[];
  defaultHashtags: string[];
  hashtagStrategy: HashtagStrategy;
  ctaTemplate?: string;
  postStructure: PostStructureType;
  emojiUsage: EmojiUsage;
  contentLength: ContentLength;
  imageStyle?: string;
  preferUserImages: boolean;
  imageOverlayText: boolean;
  platformOverrides: PlatformOverrideDto[];
  inspirationImages: InspirationImageDto[];
  createdAt: string;
  updatedAt: string;
}

export interface PlatformOverrideDto {
  id?: string;
  platform: Platform;
  toneOverride?: Tone;
  hashtagOverride: string[];
  contentLengthOverride?: ContentLength;
  additionalInstructions?: string;
  postTypePreference?: string;
  customCta?: string;
}

export interface InspirationImageDto {
  id: string;
  mediaId: string;
  path: string;
  description?: string;
}

export interface CreateTemplateDto {
  name: string;
  description?: string;
  category?: TemplateCategory;
  isGlobal?: boolean;
  brandContext?: string;
  targetAudience?: string;
  tone?: Tone;
  language?: string;
  goals?: string[];
  dos?: string[];
  donts?: string[];
  inspirationTexts?: string[];
  referenceUrls?: string[];
  examplePosts?: string[];
  defaultHashtags?: string[];
  hashtagStrategy?: HashtagStrategy;
  ctaTemplate?: string;
  postStructure?: PostStructureType;
  emojiUsage?: EmojiUsage;
  contentLength?: ContentLength;
  imageStyle?: string;
  preferUserImages?: boolean;
  imageOverlayText?: boolean;
}
