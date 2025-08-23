import {
  CompanyProfileData,
  WeeklySchedule,
  PlatformConfig,
  ProductService,
  CompetitorInfo,
  MarketingGoal,
  ContentPlanStatus,
  AutomationStatus,
  LogEntryStatus
} from './interfaces';

export class CompanyProfileResponseDto implements CompanyProfileData {
  id: string;
  name: string;
  industry: string;
  description?: string;
  products: ProductService[];
  targetAudience: string;
  competitors: CompetitorInfo[];
  usp: string;
  brandVoice: string;
  marketingGoals: MarketingGoal[];
  organizationId: string;
  isTemplate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class CompanyProfileListResponseDto {
  profiles: CompanyProfileResponseDto[];
  total: number;
  templates: CompanyProfileResponseDto[];
}

// Content Plan Response DTOs
export class ContentPlanResponseDto {
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
  
  companyProfile?: CompanyProfileResponseDto;
  automationLogs?: AutomationLogResponseDto[];
}

export class ContentPlanListResponseDto {
  plans: ContentPlanResponseDto[];
  total: number;
  activePlan?: ContentPlanResponseDto;
  templates: ContentPlanResponseDto[];
}

export class ContentPlanGenerationResponseDto {
  plan: ContentPlanResponseDto;
  generationMetadata: {
    totalPosts: number;
    platformBreakdown: {
      [platform: string]: {
        postsCount: number;
        postTypes: string[];
      };
    };
    contentCategoryBreakdown: {
      [category: string]: number;
    };
    reasoning: string;
    suggestions: string[];
  };
}

export class AutomationLogEntryResponseDto {
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
}

export class AutomationLogResponseDto {
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
  
  contentPlan?: {
    id: string;
    name: string;
    status: ContentPlanStatus;
  };
  logEntries: AutomationLogEntryResponseDto[];
}

export class AutomationLogListResponseDto {
  logs: AutomationLogResponseDto[];
  total: number;
  summary: {
    totalWeeks: number;
    successfulWeeks: number;
    failedWeeks: number;
    totalPostsGenerated: number;
    totalPostsScheduled: number;
    totalPostsFailed: number;
    averageSuccessRate: number;
  };
}

export class UsageStatsResponseDto {
  organizationId: string;
  currentMonth: {
    month: number;
    year: number;
    apiCalls: number;
    monthlyLimit: number;
    extraCredits: number;
    remainingCalls: number;
    usagePercentage: number;
  };
  history: {
    month: number;
    year: number;
    apiCalls: number;
    monthlyLimit: number;
    extraCredits: number;
  }[];
  projectedUsage?: {
    estimatedMonthlyUsage: number;
    daysUntilLimit: number;
    recommendedAction: string;
  };
}

export class UsageLimitResultResponseDto {
  canProceed: boolean;
  remainingCalls: number;
  monthlyLimit: number;
  extraCredits: number;
  usagePercentage: number;
  resetDate: Date;
  warningLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  message: string;
  upgradeOptions?: {
    additionalCredits: number;
    price: number;
    currency: string;
  }[];
}

export class AutomationDashboardResponseDto {
  activePlan?: ContentPlanResponseDto;
  usageStats: UsageStatsResponseDto;
  recentLogs: AutomationLogResponseDto[];
  upcomingPosts: {
    id: string;
    platform: string;
    postType: string;
    contentCategory: string;
    scheduledFor: Date;
    status: string;
  }[];
  systemStatus: {
    automationActive: boolean;
    lastSuccessfulGeneration?: Date;
    nextScheduledGeneration?: Date;
    systemHealth: 'healthy' | 'warning' | 'error';
    issues: string[];
  };
  weeklyProgress: {
    weekStartDate: Date;
    totalPlanned: number;
    totalGenerated: number;
    totalScheduled: number;
    totalFailed: number;
    progressPercentage: number;
  };
}

export class ContentAutomationErrorResponseDto {
  error: string;
  message: string;
  statusCode: number;
  timestamp: Date;
  path: string;
  details?: {
    field?: string;
    value?: any;
    constraint?: string;
    suggestions?: string[];
  };
}

// Success Response DTOs
export class ContentAutomationSuccessResponseDto<T = any> {
  success: boolean;
  message: string;
  data: T;
  timestamp: Date;
  metadata?: {
    processingTime?: number;
    version?: string;
    requestId?: string;
  };
}