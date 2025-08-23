export interface WeeklySchedule {
  [day: string]: DaySchedule;
}

export interface DaySchedule {
  posts: PostScheduleItem[];
}

export interface PostScheduleItem {
  id: string;
  platform: Platform;
  postType: PostType;
  contentCategory: ContentCategory;
  toneOfVoice: ToneOfVoice;
  scheduledTime: string; // HH:mm format
  isLocked: boolean;
}

export interface PlatformConfig {
  [platform: string]: {
    enabled: boolean;
    postTypes: PostType[];
    optimalTimes: string[];
    dailyLimit: number;
  };
}

export interface GenerationContext {
  companyProfile: CompanyProfileData;
  postSpecification: PostSpecification;
  platformRequirements: PlatformRequirements;
  contentHistory: ContentHistory[];
}

export interface PostSpecification {
  platform: Platform;
  postType: PostType;
  contentCategory: ContentCategory;
  toneOfVoice: ToneOfVoice;
  scheduledFor: Date;
  requirements: PostRequirements;
}

export interface PostRequirements {
  maxLength?: number;
  includeHashtags: boolean;
  includeMedia: boolean;
  mediaType?: 'image' | 'video' | 'carousel';
  callToAction?: string;
}

export interface PlatformRequirements {
  platform: Platform;
  maxLength: number;
  supportedMediaTypes: string[];
  hashtagLimit: number;
  features: string[];
}

export interface ContentHistory {
  id: string;
  content: string;
  platform: Platform;
  postType: PostType;
  contentCategory: ContentCategory;
  publishedAt: Date;
  performance?: {
    likes: number;
    shares: number;
    comments: number;
    reach: number;
  };
}

export interface CompanyProfileData {
  id?: string;
  name: string;
  industry: string;
  description?: string;
  products: ProductService[];
  targetAudience: string;
  competitors: CompetitorInfo[];
  usp: string;
  brandVoice: string;
  marketingGoals: MarketingGoal[];
  organizationId?: string;
  isTemplate?: boolean;
}

export interface ProductService {
  name: string;
  description: string;
  category: string;
  keyFeatures: string[];
}

export interface CompetitorInfo {
  name: string;
  website?: string;
  strengths: string[];
  weaknesses: string[];
  differentiators: string[];
}

export interface MarketingGoal {
  type: MarketingGoalType;
  description: string;
  priority: 'high' | 'medium' | 'low';
  metrics: string[];
}

// Enums
export enum Platform {
  TWITTER = 'twitter',
  INSTAGRAM = 'instagram',
  FACEBOOK = 'facebook',
  LINKEDIN = 'linkedin',
  TIKTOK = 'tiktok',
  YOUTUBE = 'youtube',
  PINTEREST = 'pinterest',
  THREADS = 'threads'
}

export enum PostType {
  // Twitter
  TWEET = 'tweet',
  THREAD = 'thread',
  RETWEET = 'retweet',
  
  // Instagram
  FEED_POST = 'feed_post',
  STORY = 'story',
  REEL = 'reel',
  CAROUSEL = 'carousel',
  
  // Facebook
  STATUS_UPDATE = 'status_update',
  PHOTO_POST = 'photo_post',
  VIDEO_POST = 'video_post',
  LINK_POST = 'link_post',
  
  // LinkedIn
  ARTICLE = 'article',
  UPDATE = 'update',
  POLL = 'poll',
  
  // TikTok
  VIDEO = 'video',
  
  // YouTube
  SHORT = 'short',
  COMMUNITY_POST = 'community_post',
  
  // Pinterest
  PIN = 'pin',
  IDEA_PIN = 'idea_pin',
  
  // Threads
  TEXT_POST = 'text_post',
  IMAGE_POST = 'image_post'
}

export enum ContentCategory {
  EDUCATIONAL = 'educational',
  PROMOTIONAL = 'promotional',
  ENTERTAINMENT = 'entertainment',
  BEHIND_THE_SCENES = 'behind_the_scenes',
  USER_GENERATED_CONTENT = 'user_generated_content',
  INDUSTRY_NEWS = 'industry_news',
  TIPS_AND_TUTORIALS = 'tips_and_tutorials',
  COMPANY_UPDATES = 'company_updates',
  CUSTOMER_TESTIMONIALS = 'customer_testimonials',
  PRODUCT_SHOWCASE = 'product_showcase',
  INSPIRATIONAL = 'inspirational',
  INTERACTIVE = 'interactive',
  MEME = 'meme',
  QUESTION = 'question',
  POLL = 'poll'
}

export enum ToneOfVoice {
  PROFESSIONAL = 'professional',
  CASUAL = 'casual',
  FRIENDLY = 'friendly',
  AUTHORITATIVE = 'authoritative',
  PLAYFUL = 'playful',
  INSPIRATIONAL = 'inspirational',
  HUMOROUS = 'humorous',
  EDUCATIONAL = 'educational',
  CONVERSATIONAL = 'conversational'
}

export enum MarketingGoalType {
  BRAND_AWARENESS = 'brand_awareness',
  LEAD_GENERATION = 'lead_generation',
  CUSTOMER_ENGAGEMENT = 'customer_engagement',
  SALES_CONVERSION = 'sales_conversion',
  THOUGHT_LEADERSHIP = 'thought_leadership',
  COMMUNITY_BUILDING = 'community_building',
  CUSTOMER_RETENTION = 'customer_retention',
  PRODUCT_EDUCATION = 'product_education',
  MARKET_RESEARCH = 'market_research',
  CRISIS_MANAGEMENT = 'crisis_management'
}

// Status enums for content automation
export enum ContentPlanStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED'
}

export enum AutomationStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PAUSED = 'PAUSED'
}

export enum LogEntryStatus {
  PENDING = 'PENDING',
  GENERATING = 'GENERATING',
  GENERATED = 'GENERATED',
  SCHEDULED = 'SCHEDULED',
  FAILED = 'FAILED'
}