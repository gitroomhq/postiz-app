export enum Platform {
  TWITTER = 'TWITTER',
  LINKEDIN = 'LINKEDIN',
  LINKEDIN_PAGE = 'LINKEDIN_PAGE',
  FACEBOOK = 'FACEBOOK',
  INSTAGRAM = 'INSTAGRAM',
  YOUTUBE = 'YOUTUBE',
  TIKTOK = 'TIKTOK',
  REDDIT = 'REDDIT',
  PINTEREST = 'PINTEREST',
  THREADS = 'THREADS',
  DISCORD = 'DISCORD',
  SLACK = 'SLACK',
  MASTODON = 'MASTODON',
  BLUESKY = 'BLUESKY',
  DRIBBBLE = 'DRIBBBLE',
}

export interface PlatformLimits {
  platform: Platform;
  displayName: string;
  maxChars: number;
  maxImages: number;
  maxVideos: number;
  maxVideoLengthSeconds?: number;
  maxImageSizeBytes?: number;
  maxVideoSizeBytes?: number;
  supportedImageFormats: string[];
  supportedVideoFormats: string[];
  aspectRatios?: { min: string; max: string };
  imageResizeWidth?: number;
  supportsThreads: boolean;
  supportsCarousel: boolean;
  requiresTitle: boolean;
  requiresMedia: boolean;
  requiresChannel: boolean;
  supportsComments: boolean;
  supportsPoll: boolean;
  markdownSupport: boolean;
  htmlSupport: boolean;
  iconColor: string;
}

export interface PlatformPost {
  platform: Platform;
  content: string;
  title?: string;
  media?: ProcessedMedia[];
  settings?: Record<string, unknown>;
  thread?: PlatformPost[];
}

export interface ProcessedMedia {
  id: string;
  path: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  sizeBytes?: number;
  mimeType: string;
  altText?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}
