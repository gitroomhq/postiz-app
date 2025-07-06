import { HttpException, HttpStatus } from '@nestjs/common';

export enum Sections {
  CHANNEL = 'channel',
  POSTS_PER_MONTH = 'posts_per_month',
  VIDEOS_PER_MONTH = 'videos_per_month',
  TEAM_MEMBERS = 'team_members',
  COMMUNITY_FEATURES = 'community_features',
  FEATURED_BY_GITROOM = 'featured_by_gitroom',
  AI = 'ai',
  IMPORT_FROM_CHANNELS = 'import_from_channels',
  ADMIN = 'admin',
  WEBHOOKS = 'webhooks',
}

export enum AuthorizationActions {
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
}

export class SubscriptionException extends HttpException {
  constructor(message: { section: Sections; action: AuthorizationActions }) {
    super(message, HttpStatus.PAYMENT_REQUIRED);
  }
}
