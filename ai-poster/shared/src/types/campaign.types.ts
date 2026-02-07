export enum CampaignMode {
  FULLY_AUTOMATED = 'FULLY_AUTOMATED',
  SEMI_AUTOMATED = 'SEMI_AUTOMATED',
  MANUAL = 'MANUAL',
}

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
}

export interface CampaignDto {
  id: string;
  organizationId: string;
  createdBy: string;
  templateId?: string;
  name: string;
  description?: string;
  mode: CampaignMode;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  postsPerWeek: number;
  preferredTimes: number[];
  channelIds: string[];
  postCount?: number;
  approvedCount?: number;
  postedCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignDto {
  name: string;
  description?: string;
  mode: CampaignMode;
  templateId?: string;
  startDate: string;
  endDate: string;
  postsPerWeek: number;
  preferredTimes: number[];
  integrationIds: string[];
  topics?: string[];
}

export interface CalendarSlotDto {
  id: string;
  campaignId: string;
  date: string;
  integrationId?: string;
  topic?: string;
  status: 'EMPTY' | 'FILLED' | 'SKIPPED';
  postId?: string;
}
