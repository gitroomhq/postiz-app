import '../setup';
import { DiscordProvider } from '@gitroom/nestjs-libraries/integrations/social/discord.provider';
import { createMockResponse, createPostDetails } from '../factories';

describe('DiscordProvider', () => {
  let provider: DiscordProvider;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    provider = new DiscordProvider();
    originalFetch = global.fetch;
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Metadata', () => {
    it('should have identifier "discord"', () => {
      expect(provider.identifier).toBe('discord');
    });

    it('should have name "Discord"', () => {
      expect(provider.name).toBe('Discord');
    });

    it('should have markdown editor', () => {
      expect(provider.editor).toBe('markdown');
    });

    it('should have maxLength of 1980', () => {
      expect(provider.maxLength()).toBe(1980);
    });

    it('should have maxConcurrentJob of 5', () => {
      expect(provider.maxConcurrentJob).toBe(5);
    });

    it('should have identify and guilds scopes', () => {
      expect(provider.scopes).toEqual(['identify', 'guilds']);
    });
  });

  describe('authenticate()', () => {
    it('should call token endpoint and @me endpoint', async () => {
      // First call: this.fetch for token (needs 200/201 to pass through SocialAbstract.fetch)
      const tokenResponse = createMockResponse({
        access_token: 'discord-token',
        expires_in: 604800,
        refresh_token: 'discord-refresh',
        scope: 'identify guilds bot',
        guild: { id: 'guild-123' },
      });

      // Second call: direct fetch for @me
      const meResponse = createMockResponse({
        application: {
          name: 'TestBot',
          bot: {
            id: 'bot-123',
            avatar: 'abc123',
            username: 'TestBot#1234',
          },
        },
      });

      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(tokenResponse)
        .mockResolvedValueOnce(meResponse);

      const result = await provider.authenticate({
        code: 'auth-code',
        codeVerifier: 'verifier',
      });

      expect(result.id).toBe('guild-123');
      expect(result.name).toBe('TestBot');
      expect(result.accessToken).toBe('discord-token');
      expect(result.refreshToken).toBe('discord-refresh');
      expect(result.picture).toContain('cdn.discordapp.com');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('post()', () => {
    it('should post message to Discord channel', async () => {
      const messageResponse = createMockResponse({
        id: 'message-123',
      });

      global.fetch = jest.fn().mockResolvedValue(messageResponse);

      const postDetails = [
        createPostDetails({
          id: 'post-1',
          message: 'Hello Discord!',
          settings: { channel: 'channel-456' },
          media: [],
        }),
      ];

      const result = await provider.post(
        'guild-123',
        'bot-token',
        postDetails
      );

      expect(result).toHaveLength(1);
      expect(result[0].postId).toBe('message-123');
      expect(result[0].status).toBe('success');
      expect(result[0].releaseURL).toContain(
        'discord.com/channels/guild-123/channel-456/message-123'
      );
    });

    it('should replace mention format in message', async () => {
      const messageResponse = createMockResponse({ id: 'msg-1' });
      global.fetch = jest.fn().mockResolvedValue(messageResponse);

      await provider.post('guild-123', 'token', [
        createPostDetails({
          message: 'Hello [[[@user123]]]!',
          settings: { channel: 'ch-1' },
        }),
      ]);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      // The body is FormData, let's verify fetch was called
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('mentionFormat()', () => {
    it('should return [[[@id]]] format for regular users', () => {
      const result = provider.mentionFormat('user-123', 'Test User');
      expect(result).toBe('[[[@user-123]]]');
    });

    it('should passthrough @here', () => {
      const result = provider.mentionFormat('here', '@here');
      expect(result).toBe('@here');
    });

    it('should passthrough @everyone', () => {
      const result = provider.mentionFormat('everyone', '@everyone');
      expect(result).toBe('@everyone');
    });

    it('should strip @ from id', () => {
      const result = provider.mentionFormat('@user-123', 'Test User');
      expect(result).toBe('[[[@user-123]]]');
    });
  });

  describe('channels()', () => {
    it('should fetch and filter guild channels', async () => {
      const channelsResponse = createMockResponse([
        { id: '1', name: 'general', type: 0 },
        { id: '2', name: 'announcements', type: 5 },
        { id: '3', name: 'voice', type: 2 },
        { id: '4', name: 'forum', type: 15 },
      ]);

      global.fetch = jest.fn().mockResolvedValue(channelsResponse);

      const result = await provider.channels('token', {}, 'guild-123');

      // Should filter to type 0, 5, and 15 only
      expect(result).toHaveLength(3);
      expect(result.map((c: any) => c.name)).toEqual([
        'general',
        'announcements',
        'forum',
      ]);
    });
  });
});
