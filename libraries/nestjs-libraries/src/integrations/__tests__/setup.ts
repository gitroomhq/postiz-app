// Global test setup - mocks that must be in place before provider imports

// Mock @temporalio/activity (heavy native dependency via core-bridge)
jest.mock('@temporalio/activity', () => {
  class ApplicationFailure extends Error {
    public readonly type: string;
    public readonly nonRetryable: boolean;
    public readonly details: any[];

    constructor(
      message: string,
      type: string,
      nonRetryable: boolean,
      details: any[] = []
    ) {
      super(message);
      this.name = 'ApplicationFailure';
      this.type = type;
      this.nonRetryable = nonRetryable;
      this.details = details;
    }
  }

  return { ApplicationFailure };
});

// Mock timer to resolve immediately (prevents 5s delays in retry logic)
jest.mock('@gitroom/helpers/utils/timer', () => ({
  timer: jest.fn().mockResolvedValue(undefined),
}));

// Mock node-telegram-bot-api (Telegram creates bot instance at module scope)
jest.mock('node-telegram-bot-api', () => {
  return jest.fn().mockImplementation(() => ({
    sendMessage: jest.fn(),
    sendPhoto: jest.fn(),
    sendVideo: jest.fn(),
    sendDocument: jest.fn(),
    sendMediaGroup: jest.fn(),
  }));
});

// Mock sharp (native binary, heavy import)
jest.mock('sharp', () => {
  const sharpInstance = {
    toFormat: jest.fn().mockReturnThis(),
    resize: jest.fn().mockReturnThis(),
    metadata: jest.fn().mockResolvedValue({ width: 1000, height: 1000 }),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('test')),
    gif: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
  };
  return jest.fn().mockReturnValue(sharpInstance);
});

// Mock readOrFetch (prevents actual file/network reads)
jest.mock('@gitroom/helpers/utils/read.or.fetch', () => ({
  readOrFetch: jest.fn().mockResolvedValue(Buffer.from('test-content')),
}));

// Mock image-to-pdf (used by LinkedIn carousel)
jest.mock('image-to-pdf', () =>
  jest.fn().mockReturnValue({
    on: jest.fn((event: string, callback: Function) => {
      if (event === 'data') callback(Buffer.from('pdf'));
      if (event === 'end') callback();
    }),
  })
);

// Mock nostr-tools (used by Nostr provider - creates SimplePool at module scope)
jest.mock('nostr-tools', () => ({
  getPublicKey: jest.fn().mockReturnValue('mock-pubkey'),
  nip19: { npubEncode: jest.fn().mockReturnValue('npub-mock') },
  finalizeEvent: jest.fn().mockReturnValue({ id: 'mock-event-id', sig: 'mock-sig' }),
  verifyEvent: jest.fn().mockReturnValue(true),
  SimplePool: jest.fn().mockImplementation(() => ({
    querySync: jest.fn().mockResolvedValue([]),
    publish: jest.fn().mockResolvedValue(undefined),
    close: jest.fn(),
  })),
  Relay: {
    connect: jest.fn().mockResolvedValue({
      publish: jest.fn().mockResolvedValue(undefined),
      close: jest.fn(),
    }),
  },
}));

// Mock ws (WebSocket used by Reddit)
jest.mock('ws', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    send: jest.fn(),
    close: jest.fn(),
  }));
});

// Set required env vars that providers read at import time
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'https://test.example.com';
process.env.DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || 'test-discord-client-id';
process.env.DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || 'test-discord-secret';
process.env.DISCORD_BOT_TOKEN_ID = process.env.DISCORD_BOT_TOKEN_ID || 'test-discord-bot-token';
process.env.LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || 'test-linkedin-id';
process.env.LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || 'test-linkedin-secret';
process.env.X_API_KEY = process.env.X_API_KEY || 'test-x-key';
process.env.X_API_SECRET = process.env.X_API_SECRET || 'test-x-secret';
process.env.TIKTOK_CLIENT_ID = process.env.TIKTOK_CLIENT_ID || 'test-tiktok-id';
process.env.TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET || 'test-tiktok-secret';
process.env.TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || 'test-telegram-token';
process.env.REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID || 'test-reddit-id';
process.env.REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET || 'test-reddit-secret';
process.env.FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || 'test-fb-id';
process.env.FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || 'test-fb-secret';
process.env.YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID || 'test-yt-id';
process.env.YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET || 'test-yt-secret';
process.env.PINTEREST_CLIENT_ID = process.env.PINTEREST_CLIENT_ID || 'test-pin-id';
process.env.PINTEREST_CLIENT_SECRET = process.env.PINTEREST_CLIENT_SECRET || 'test-pin-secret';
process.env.DRIBBBLE_CLIENT_ID = process.env.DRIBBBLE_CLIENT_ID || 'test-dribbble-id';
process.env.DRIBBBLE_CLIENT_SECRET = process.env.DRIBBBLE_CLIENT_SECRET || 'test-dribbble-secret';
process.env.THREADS_APP_ID = process.env.THREADS_APP_ID || 'test-threads-id';
process.env.THREADS_APP_SECRET = process.env.THREADS_APP_SECRET || 'test-threads-secret';
process.env.SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID || 'test-slack-id';
process.env.SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET || 'test-slack-secret';
process.env.VK_CLIENT_ID = process.env.VK_CLIENT_ID || 'test-vk-id';
process.env.VK_CLIENT_SECRET = process.env.VK_CLIENT_SECRET || 'test-vk-secret';
process.env.GMB_CLIENT_ID = process.env.GMB_CLIENT_ID || 'test-gmb-id';
process.env.GMB_CLIENT_SECRET = process.env.GMB_CLIENT_SECRET || 'test-gmb-secret';
process.env.TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID || 'test-twitch-id';
process.env.TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET || 'test-twitch-secret';
process.env.KICK_PROVIDER_TOKEN = process.env.KICK_PROVIDER_TOKEN || 'test-kick-token';
process.env.NOSTR_PRIVATE_KEY = process.env.NOSTR_PRIVATE_KEY || 'test-nostr-key';
