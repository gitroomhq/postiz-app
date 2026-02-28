import '../setup';
import { XProvider } from '@gitroom/nestjs-libraries/integrations/social/x.provider';

jest.mock('sharp', () => jest.fn().mockReturnValue({
  toFormat: jest.fn().mockReturnThis(),
  resize: jest.fn().mockReturnThis(),
  gif: jest.fn().mockReturnThis(),
  toBuffer: jest.fn().mockResolvedValue(Buffer.from('test')),
}));

jest.mock('@gitroom/helpers/utils/read.or.fetch', () => ({
  readOrFetch: jest.fn().mockResolvedValue(Buffer.from('test-image')),
}));

// Mock TwitterApi
const mockTweet = jest.fn().mockResolvedValue({
  data: { id: 'tweet-123' },
});
const mockMe = jest.fn().mockResolvedValue({
  data: { username: 'testuser', verified: false, profile_image_url: 'pic.jpg', name: 'Test', id: '123' },
});
const mockUploadMedia = jest.fn().mockResolvedValue('media-id-123');
const mockLogin = jest.fn().mockResolvedValue({
  accessToken: 'at',
  accessSecret: 'as',
  client: { v2: { me: mockMe } },
});
const mockGenerateAuthLink = jest.fn().mockResolvedValue({
  url: 'https://twitter.com/auth',
  oauth_token: 'token',
  oauth_token_secret: 'secret',
});

jest.mock('twitter-api-v2', () => ({
  TwitterApi: jest.fn().mockImplementation(() => ({
    v2: {
      tweet: mockTweet,
      me: mockMe,
      uploadMedia: mockUploadMedia,
    },
    login: mockLogin,
    generateAuthLink: mockGenerateAuthLink,
  })),
}));

describe('XProvider', () => {
  let provider: XProvider;

  beforeEach(() => {
    provider = new XProvider();
    jest.clearAllMocks();
  });

  describe('Metadata', () => {
    it('should have identifier "x"', () => {
      expect(provider.identifier).toBe('x');
    });

    it('should have name "X"', () => {
      expect(provider.name).toBe('X');
    });

    it('should have empty scopes for OAuth 1.0a', () => {
      expect(provider.scopes).toEqual([]);
    });

    it('should have maxLength(false) = 200', () => {
      expect(provider.maxLength(false)).toBe(200);
    });

    it('should have maxLength(true) = 4000 for premium', () => {
      expect(provider.maxLength(true)).toBe(4000);
    });

    it('should have normal editor', () => {
      expect(provider.editor).toBe('normal');
    });

    it('should have maxConcurrentJob of 1', () => {
      expect(provider.maxConcurrentJob).toBe(1);
    });
  });

  describe('handleErrors()', () => {
    const errorCases = [
      {
        input: 'Unsupported Authentication',
        expected: {
          type: 'refresh-token',
          value: 'X authentication has expired, please reconnect your account',
        },
      },
      {
        input: 'usage-capped',
        expected: {
          type: 'bad-body',
          value: 'Posting failed - capped reached. Please try again later',
        },
      },
      {
        input: 'duplicate-rules',
        expected: {
          type: 'bad-body',
          value:
            'You have already posted this post, please wait before posting again',
        },
      },
      {
        input: 'The Tweet contains an invalid URL.',
        expected: {
          type: 'bad-body',
          value: 'The Tweet contains a URL that is not allowed on X',
        },
      },
      {
        input:
          'This user is not allowed to post a video longer than 2 minutes',
        expected: {
          type: 'bad-body',
          value:
            'The video you are trying to post is longer than 2 minutes, which is not allowed for this account',
        },
      },
    ];

    it.each(errorCases)(
      'should handle "$input" error',
      ({ input, expected }) => {
        const result = provider.handleErrors(input);
        expect(result).toEqual(expected);
      }
    );

    it('should return undefined for unknown errors', () => {
      expect(provider.handleErrors('some unknown error')).toBeUndefined();
    });
  });

  describe('post()', () => {
    it('should call TwitterApi v2.tweet and return PostResponse', async () => {
      const result = await provider.post('user-123', 'access:secret', [
        {
          id: 'post-1',
          message: 'Hello X!',
          settings: {
            active_thread_finisher: false,
            thread_finisher: '',
            who_can_reply_post: 'everyone' as const,
          },
          media: [],
        },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].postId).toBe('tweet-123');
      expect(result[0].status).toBe('posted');
      expect(result[0].releaseURL).toContain('twitter.com/testuser/status/tweet-123');
    });
  });

  describe('mentionFormat()', () => {
    it('should return @handle format', () => {
      const result = provider.mentionFormat('johndoe', 'John Doe');
      expect(result).toBe('@johndoe');
    });
  });
});
