import { 
  ContentPlanStatus, 
  AutomationStatus, 
  LogEntryStatus 
} from './interfaces';

import {
  Platform,
  PostType,
  ContentCategory,
  ToneOfVoice,
  MarketingGoalType,
  WeeklySchedule,
  PlatformConfig,
  GenerationContext,
  PostSpecification,
  CompanyProfileData
} from './interfaces';

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  timestamp: Date;
};

export type PaginatedResponse<T> = ApiResponse<{
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>;

export type ContentPlanWithRelations = {
  id: string;
  name: string;
  companyProfileId: string;
  status: ContentPlanStatus;
  weeklySchedule: WeeklySchedule;
  platformConfig: PlatformConfig;
  isTemplate: boolean;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  activatedAt?: Date;
  companyProfile: CompanyProfileData;
  automationLogs: AutomationLogWithEntries[];
};

export type AutomationLogWithEntries = {
  id: string;
  contentPlanId: string;
  weekStartDate: Date;
  status: AutomationStatus;
  totalPlanned: number;
  totalGenerated: number;
  totalScheduled: number;
  totalFailed: number;
  errorDetails?: any;
  createdAt: Date;
  updatedAt: Date;
  logEntries: AutomationLogEntryWithPost[];
};

export type AutomationLogEntryWithPost = {
  id: string;
  automationLogId: string;
  postType: string;
  platform: string;
  contentCategory: string;
  status: LogEntryStatus;
  scheduledFor?: Date;
  postId?: string;
  errorMessage?: string;
  createdAt: Date;
  post?: {
    id: string;
    content: string;
    publishDate: Date;
    state: string;
  };
};

export type GenerationResult = {
  success: boolean;
  content?: string;
  media?: {
    type: 'image' | 'video' | 'carousel';
    urls: string[];
    alt?: string;
  };
  metadata?: {
    tokensUsed: number;
    generationTime: number;
    model: string;
    prompt: string;
  };
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
};

export type BatchGenerationResult = {
  results: (GenerationResult & { postId: string })[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    totalTokensUsed: number;
    totalGenerationTime: number;
  };
};

export type UsageLimit = {
  monthlyLimit: number;
  currentUsage: number;
  extraCredits: number;
  resetDate: Date;
  warningThreshold: number;
  criticalThreshold: number;
};

export type UsageTrackingResult = {
  canProceed: boolean;
  remainingCalls: number;
  usagePercentage: number;
  warningLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  message: string;
  resetDate: Date;
};

export type PlatformCapabilities = {
  [K in Platform]: {
    maxTextLength: number;
    supportedMediaTypes: ('image' | 'video' | 'carousel' | 'gif')[];
    maxMediaCount: number;
    supportsHashtags: boolean;
    maxHashtags: number;
    supportsThreads: boolean;
    supportsPolls: boolean;
    supportsScheduling: boolean;
    optimalPostingTimes: string[];
    postTypes: PostType[];
  };
};

export type WeeklyGenerationJob = {
  contentPlanId: string;
  weekStartDate: Date;
  organizationId: string;
  priority: 'high' | 'medium' | 'low';
  retryCount?: number;
};

export type SinglePostJob = {
  postSpecification: PostSpecification;
  generationContext: GenerationContext;
  organizationId: string;
  automationLogEntryId?: string;
  retryCount?: number;
};

export type ContentAutomationError = {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  suggestedAction?: string;
};

export type ValidationError = {
  field: string;
  value: any;
  constraint: string;
  message: string;
};

export type DashboardMetrics = {
  totalPlansCreated: number;
  activePlans: number;
  totalPostsGenerated: number;
  totalPostsScheduled: number;
  successRate: number;
  averageGenerationTime: number;
  topPerformingCategories: {
    category: ContentCategory;
    count: number;
    successRate: number;
  }[];
  platformDistribution: {
    platform: Platform;
    count: number;
    percentage: number;
  }[];
};

export type ContentPlanTemplate = {
  id: string;
  name: string;
  description?: string;
  weeklySchedule: WeeklySchedule;
  platformConfig: PlatformConfig;
  compatiblePlatforms: Platform[];
  category: string;
  tags: string[];
  usageCount: number;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ContentPlanFilters = {
  status?: ContentPlanStatus[];
  platforms?: Platform[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
  isTemplate?: boolean;
};

export type AutomationLogFilters = {
  status?: AutomationStatus[];
  platforms?: Platform[];
  contentCategories?: ContentCategory[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
};

export type AutomationWebhookPayload = {
  event: 'plan_activated' | 'plan_deactivated' | 'generation_completed' | 'generation_failed' | 'usage_limit_reached';
  organizationId: string;
  contentPlanId?: string;
  automationLogId?: string;
  data: any;
  timestamp: Date;
};