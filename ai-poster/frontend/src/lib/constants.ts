import { Platform } from '@ai-poster/shared';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || '/api';

export const PLATFORM_ICON_COLORS: Record<Platform, string> = {
  [Platform.TWITTER]: '#000000',
  [Platform.LINKEDIN]: '#0A66C2',
  [Platform.LINKEDIN_PAGE]: '#0A66C2',
  [Platform.FACEBOOK]: '#1877F2',
  [Platform.INSTAGRAM]: '#E4405F',
  [Platform.YOUTUBE]: '#FF0000',
  [Platform.TIKTOK]: '#000000',
  [Platform.REDDIT]: '#FF4500',
  [Platform.PINTEREST]: '#E60023',
  [Platform.THREADS]: '#000000',
  [Platform.DISCORD]: '#5865F2',
  [Platform.SLACK]: '#4A154B',
  [Platform.MASTODON]: '#6364FF',
  [Platform.BLUESKY]: '#0085FF',
  [Platform.DRIBBBLE]: '#EA4C89',
};

export const PLATFORM_DISPLAY_NAMES: Record<Platform, string> = {
  [Platform.TWITTER]: 'X (Twitter)',
  [Platform.LINKEDIN]: 'LinkedIn',
  [Platform.LINKEDIN_PAGE]: 'LinkedIn Page',
  [Platform.FACEBOOK]: 'Facebook',
  [Platform.INSTAGRAM]: 'Instagram',
  [Platform.YOUTUBE]: 'YouTube',
  [Platform.TIKTOK]: 'TikTok',
  [Platform.REDDIT]: 'Reddit',
  [Platform.PINTEREST]: 'Pinterest',
  [Platform.THREADS]: 'Threads',
  [Platform.DISCORD]: 'Discord',
  [Platform.SLACK]: 'Slack',
  [Platform.MASTODON]: 'Mastodon',
  [Platform.BLUESKY]: 'Bluesky',
  [Platform.DRIBBBLE]: 'Dribbble',
};

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-status-draft text-white',
  AI_GENERATED: 'bg-status-generated text-white',
  PENDING_APPROVAL: 'bg-status-pending text-white',
  APPROVED: 'bg-status-approved text-white',
  SCHEDULED: 'bg-status-scheduled text-white',
  PUBLISHING: 'bg-status-publishing text-white',
  POSTED: 'bg-status-posted text-white',
  FAILED: 'bg-status-failed text-white',
  REJECTED: 'bg-status-rejected text-white',
  ACTIVE: 'bg-status-approved text-white',
  PAUSED: 'bg-status-generated text-white',
  COMPLETED: 'bg-status-posted text-white',
};

export const STATUS_DOT_COLORS: Record<string, string> = {
  DRAFT: 'bg-status-draft',
  AI_GENERATED: 'bg-status-generated',
  PENDING_APPROVAL: 'bg-status-pending',
  APPROVED: 'bg-status-approved',
  SCHEDULED: 'bg-status-scheduled',
  PUBLISHING: 'bg-status-publishing',
  POSTED: 'bg-status-posted',
  FAILED: 'bg-status-failed',
  REJECTED: 'bg-status-rejected',
};
