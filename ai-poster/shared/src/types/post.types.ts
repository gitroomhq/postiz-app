export enum PostState {
  DRAFT = 'DRAFT',
  AI_GENERATED = 'AI_GENERATED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  SCHEDULED = 'SCHEDULED',
  PUBLISHING = 'PUBLISHING',
  POSTED = 'POSTED',
  FAILED = 'FAILED',
  REJECTED = 'REJECTED',
}

export enum PostSourceType {
  MANUAL = 'MANUAL',
  AI_FULL = 'AI_FULL',
  AI_FROM_IMAGE = 'AI_FROM_IMAGE',
  AI_FROM_URL = 'AI_FROM_URL',
  AI_IMPROVED = 'AI_IMPROVED',
}

export interface PostDto {
  id: string;
  campaignId?: string;
  organizationId: string;
  integrationId: string;
  templateId?: string;
  group: string;
  content: string;
  plainText: string;
  sourceType: PostSourceType;
  state: PostState;
  publishDate?: string;
  publishedAt?: string;
  delay: number;
  parentPostId?: string;
  order: number;
  regenerationCount: number;
  platformPostId?: string;
  platformUrl?: string;
  platformSettings?: Record<string, unknown>;
  media?: PostMediaDto[];
  tags?: TagDto[];
  createdAt: string;
  updatedAt: string;
}

export interface PostMediaDto {
  id: string;
  mediaId: string;
  order: number;
  altText?: string;
  path: string;
  type: string;
}

export interface TagDto {
  id: string;
  name: string;
  color: string;
}

export interface CreatePostDto {
  integrationIds: string[];
  content: string;
  templateId?: string;
  publishDate?: string;
  mediaIds?: string[];
  tags?: string[];
  platformSettings?: Record<string, unknown>;
  parentPostId?: string;
  state?: PostState;
}

export interface ApprovalAction {
  action: 'APPROVED' | 'REJECTED' | 'REGENERATE';
  feedback?: string;
}
