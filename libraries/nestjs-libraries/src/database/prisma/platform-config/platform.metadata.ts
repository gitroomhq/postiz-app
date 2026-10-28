export interface PlatformFieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'password';
  isSecret: boolean;
  placeholder?: string;
  description?: string;
  defaultValue?: string;
}

export interface PlatformDefinition {
  id: string;
  name: string;
  category: 'social' | 'community' | 'ai' | 'other';
  icon: string; // Identifier for front-end icon
  callbackPath?: string; // Path relative to MAIN_URL e.g. /integrations/social/x
  docsUrl?: string;
  fields: PlatformFieldDefinition[];
}

export const PLATFORM_DEFINITIONS: PlatformDefinition[] = [
  {
    id: 'x',
    name: 'X (Twitter)',
    category: 'social',
    icon: 'x',
    callbackPath: '/integrations/social/x',
    docsUrl: 'https://developer.x.com/en/portal/dashboard',
    fields: [
      {
        key: 'X_API_KEY',
        label: 'API Key (Client ID)',
        type: 'text',
        isSecret: false,
        placeholder: 'e.g. WUZ4...',
        description: 'Client ID or API Key from Twitter Developer Portal',
      },
      {
        key: 'X_API_SECRET',
        label: 'API Secret (Client Secret)',
        type: 'password',
        isSecret: true,
        placeholder: 'Client Secret',
        description: 'Client Secret from Twitter Developer Portal',
      },
    ],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    category: 'social',
    icon: 'linkedin',
    callbackPath: '/integrations/social/linkedin',
    docsUrl: 'https://www.linkedin.com/developers/apps',
    fields: [
      {
        key: 'LINKEDIN_CLIENT_ID',
        label: 'Client ID',
        type: 'text',
        isSecret: false,
        placeholder: 'e.g. 78xxxxxxxx',
      },
      {
        key: 'LINKEDIN_CLIENT_SECRET',
        label: 'Client Secret',
        type: 'password',
        isSecret: true,
        placeholder: 'Client Secret',
      },
    ],
  },
  {
    id: 'facebook',
    name: 'Facebook & Instagram',
    category: 'social',
    icon: 'facebook',
    callbackPath: '/integrations/social/facebook',
    docsUrl: 'https://developers.facebook.com/apps/',
    fields: [
      {
        key: 'FACEBOOK_APP_ID',
        label: 'App ID',
        type: 'text',
        isSecret: false,
        placeholder: 'e.g. 123456789012345',
      },
      {
        key: 'FACEBOOK_APP_SECRET',
        label: 'App Secret',
        type: 'password',
        isSecret: true,
        placeholder: 'App Secret',
      },
    ],
  },
  {
    id: 'youtube',
    name: 'YouTube (Google)',
    category: 'social',
    icon: 'youtube',
    callbackPath: '/integrations/social/youtube',
    docsUrl: 'https://console.cloud.google.com/apis/credentials',
    fields: [
      {
        key: 'YOUTUBE_CLIENT_ID',
        label: 'OAuth 2.0 Client ID',
        type: 'text',
        isSecret: false,
        placeholder: 'e.g. xxxxx.apps.googleusercontent.com',
      },
      {
        key: 'YOUTUBE_CLIENT_SECRET',
        label: 'Client Secret',
        type: 'password',
        isSecret: true,
        placeholder: 'Client Secret',
      },
    ],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    category: 'social',
    icon: 'tiktok',
    callbackPath: '/integrations/social/tiktok',
    docsUrl: 'https://developers.tiktok.com/',
    fields: [
      {
        key: 'TIKTOK_CLIENT_ID',
        label: 'Client Key / App ID',
        type: 'text',
        isSecret: false,
        placeholder: 'Client Key',
      },
      {
        key: 'TIKTOK_CLIENT_SECRET',
        label: 'Client Secret',
        type: 'password',
        isSecret: true,
        placeholder: 'Client Secret',
      },
    ],
  },
  {
    id: 'tiktok-business',
    name: 'TikTok Business',
    category: 'social',
    icon: 'tiktok',
    callbackPath: '/integrations/social/tiktok-business',
    docsUrl: 'https://business-api.tiktok.com/portal',
    fields: [
      {
        key: 'TIKTOK_BUSINESS_CLIENT_ID',
        label: 'App ID',
        type: 'text',
        isSecret: false,
      },
      {
        key: 'TIKTOK_BUSINESS_CLIENT_SECRET',
        label: 'Secret',
        type: 'password',
        isSecret: true,
      },
    ],
  },
  {
    id: 'threads',
    name: 'Threads',
    category: 'social',
    icon: 'threads',
    callbackPath: '/integrations/social/threads',
    docsUrl: 'https://developers.facebook.com/apps/',
    fields: [
      {
        key: 'THREADS_APP_ID',
        label: 'Threads App ID',
        type: 'text',
        isSecret: false,
      },
      {
        key: 'THREADS_APP_SECRET',
        label: 'Threads App Secret',
        type: 'password',
        isSecret: true,
      },
    ],
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    category: 'social',
    icon: 'pinterest',
    callbackPath: '/integrations/social/pinterest',
    docsUrl: 'https://developers.pinterest.com/apps/',
    fields: [
      {
        key: 'PINTEREST_CLIENT_ID',
        label: 'App ID',
        type: 'text',
        isSecret: false,
      },
      {
        key: 'PINTEREST_CLIENT_SECRET',
        label: 'App Secret',
        type: 'password',
        isSecret: true,
      },
    ],
  },
  {
    id: 'reddit',
    name: 'Reddit',
    category: 'community',
    icon: 'reddit',
    callbackPath: '/integrations/social/reddit',
    docsUrl: 'https://www.reddit.com/prefs/apps',
    fields: [
      {
        key: 'REDDIT_CLIENT_ID',
        label: 'Client ID',
        type: 'text',
        isSecret: false,
      },
      {
        key: 'REDDIT_CLIENT_SECRET',
        label: 'Client Secret',
        type: 'password',
        isSecret: true,
      },
    ],
  },
  {
    id: 'discord',
    name: 'Discord',
    category: 'community',
    icon: 'discord',
    callbackPath: '/integrations/social/discord',
    docsUrl: 'https://discord.com/developers/applications',
    fields: [
      {
        key: 'DISCORD_CLIENT_ID',
        label: 'Application ID (Client ID)',
        type: 'text',
        isSecret: false,
      },
      {
        key: 'DISCORD_CLIENT_SECRET',
        label: 'Client Secret',
        type: 'password',
        isSecret: true,
      },
      {
        key: 'DISCORD_BOT_TOKEN_ID',
        label: 'Bot Token',
        type: 'password',
        isSecret: true,
      },
    ],
  },
  {
    id: 'slack',
    name: 'Slack',
    category: 'community',
    icon: 'slack',
    callbackPath: '/integrations/social/slack',
    docsUrl: 'https://api.slack.com/apps',
    fields: [
      {
        key: 'SLACK_ID',
        label: 'Client ID',
        type: 'text',
        isSecret: false,
      },
      {
        key: 'SLACK_SECRET',
        label: 'Client Secret',
        type: 'password',
        isSecret: true,
      },
      {
        key: 'SLACK_SIGNING_SECRET',
        label: 'Signing Secret',
        type: 'password',
        isSecret: true,
      },
    ],
  },
  {
    id: 'dribbble',
    name: 'Dribbble',
    category: 'social',
    icon: 'dribbble',
    callbackPath: '/integrations/social/dribbble',
    docsUrl: 'https://dribbble.com/account/applications',
    fields: [
      {
        key: 'DRIBBBLE_CLIENT_ID',
        label: 'Client ID',
        type: 'text',
        isSecret: false,
      },
      {
        key: 'DRIBBBLE_CLIENT_SECRET',
        label: 'Client Secret',
        type: 'password',
        isSecret: true,
      },
    ],
  },
  {
    id: 'tumblr',
    name: 'Tumblr',
    category: 'social',
    icon: 'tumblr',
    callbackPath: '/integrations/social/tumblr',
    docsUrl: 'https://www.tumblr.com/oauth/apps',
    fields: [
      {
        key: 'TUMBLR_CLIENT_ID',
        label: 'OAuth Consumer Key',
        type: 'text',
        isSecret: false,
      },
      {
        key: 'TUMBLR_CLIENT_SECRET',
        label: 'OAuth Secret Key',
        type: 'password',
        isSecret: true,
      },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI (AI Copilot)',
    category: 'ai',
    icon: 'openai',
    docsUrl: 'https://platform.openai.com/api-keys',
    fields: [
      {
        key: 'OPENAI_API_KEY',
        label: 'API Key',
        type: 'password',
        isSecret: true,
        placeholder: 'sk-...',
        description: 'Key for AI post generation and captions',
      },
    ],
  },
];
