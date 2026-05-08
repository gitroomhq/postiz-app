import { MetricMapping } from '../interfaces/metric-mapping.interface';

export const SOCIAL_METRIC_MAPPINGS: Record<string, MetricMapping> = {
  instagram: {
    Followers: 'followers',
    Likes: 'likes',
    Comments: 'comments',
    Shares: 'shares',
    Views: 'views',
    Reach: 'reach',
  },

  x: {
    Impressions: 'impressions',
    Engagements: 'engagements',
    Followers: 'followers',
  },

  youtube: {
    Views: 'views',
    Likes: 'likes',
    Comments: 'comments',
    Subscribers: 'subscribers',
  },
};
