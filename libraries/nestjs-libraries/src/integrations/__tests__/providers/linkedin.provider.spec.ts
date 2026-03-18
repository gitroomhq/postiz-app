import '../setup';
import { LinkedinProvider } from '@gitroom/nestjs-libraries/integrations/social/linkedin.provider';
import { createMockResponse, createPostDetails, createIntegration } from '../factories';

jest.mock('sharp', () => jest.fn().mockReturnValue({
  toFormat: jest.fn().mockReturnThis(),
  resize: jest.fn().mockReturnThis(),
  metadata: jest.fn().mockResolvedValue({ width: 1000, height: 1000 }),
  toBuffer: jest.fn().mockResolvedValue(Buffer.from('test')),
  gif: jest.fn().mockReturnThis(),
}));

jest.mock('@gitroom/helpers/utils/read.or.fetch', () => ({
  readOrFetch: jest.fn().mockResolvedValue(Buffer.from('test-image')),
}));

jest.mock('image-to-pdf', () =>
  jest.fn().mockReturnValue({
    on: jest.fn((event, callback) => {
      if (event === 'data') callback(Buffer.from('pdf'));
      if (event === 'end') callback();
    }),
  })
);

describe('LinkedinProvider', () => {
  let provider: LinkedinProvider;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    provider = new LinkedinProvider();
    originalFetch = global.fetch;
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Metadata', () => {
    it('should have identifier "linkedin"', () => {
      expect(provider.identifier).toBe('linkedin');
    });

    it('should have name "LinkedIn"', () => {
      expect(provider.name).toBe('LinkedIn');
    });

    it('should have maxLength of 3000', () => {
      expect(provider.maxLength()).toBe(3000);
    });

    it('should have oneTimeToken enabled', () => {
      expect(provider.oneTimeToken).toBe(true);
    });

    it('should have refreshWait enabled', () => {
      expect(provider.refreshWait).toBe(true);
    });

    it('should have 7 scopes', () => {
      expect(provider.scopes).toHaveLength(7);
      expect(provider.scopes).toContain('openid');
      expect(provider.scopes).toContain('profile');
      expect(provider.scopes).toContain('w_member_social');
    });

    it('should have normal editor', () => {
      expect(provider.editor).toBe('normal');
    });

    it('should have maxConcurrentJob of 2', () => {
      expect(provider.maxConcurrentJob).toBe(2);
    });
  });

  describe('handleErrors()', () => {
    it('should return retry for "Unable to obtain activity"', () => {
      const result = provider.handleErrors('Unable to obtain activity for URN');
      expect(result).toEqual({
        type: 'retry',
        value: 'Unable to obtain activity',
      });
    });

    it('should return retry for "resource is forbidden"', () => {
      const result = provider.handleErrors('The resource is forbidden');
      expect(result).toEqual({
        type: 'retry',
        value: 'Resource is forbidden',
      });
    });

    it('should return undefined for unknown errors', () => {
      const result = provider.handleErrors('some random error');
      expect(result).toBeUndefined();
    });
  });

  describe('authenticate()', () => {
    it('should call 3 fetch endpoints and return auth details', async () => {
      const tokenResponse = createMockResponse({
        access_token: 'li-access-token',
        expires_in: 3600,
        refresh_token: 'li-refresh-token',
        scope: 'openid profile w_member_social r_basicprofile rw_organization_admin w_organization_social r_organization_social',
      });

      const userinfoResponse = createMockResponse({
        name: 'Test User',
        sub: 'user-123',
        picture: 'https://pic.example.com/avatar.jpg',
      });

      const meResponse = createMockResponse({
        vanityName: 'testuser',
      });

      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(tokenResponse)
        .mockResolvedValueOnce(userinfoResponse)
        .mockResolvedValueOnce(meResponse);

      const result = await provider.authenticate({
        code: 'auth-code',
        codeVerifier: 'verifier',
      });

      expect(result.id).toBe('user-123');
      expect(result.accessToken).toBe('li-access-token');
      expect(result.refreshToken).toBe('li-refresh-token');
      expect(result.name).toBe('Test User');
      expect(result.username).toBe('testuser');
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('post()', () => {
    it('should create a post and return PostResponse with releaseURL', async () => {
      // Mock for processMediaForPosts (no media)
      const postResponse = createMockResponse(
        {},
        201,
        { 'x-restli-id': 'urn:li:share:12345' }
      );
      // Override provider.fetch to use our mock
      global.fetch = jest.fn().mockResolvedValue(postResponse);

      const postDetails = [
        createPostDetails({
          id: 'post-1',
          message: 'Hello LinkedIn!',
          settings: { post_as_images_carousel: false },
          media: [],
        }),
      ];

      const integration = createIntegration({
        internalId: 'person-id',
      });

      const result = await provider.post(
        'person-id',
        'access-token',
        postDetails,
        integration,
        'personal'
      );

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('posted');
      expect(result[0].id).toBe('post-1');
      expect(result[0].releaseURL).toContain('linkedin.com/feed/update/');
    });
  });

  describe('mentionFormat()', () => {
    it('should return correct LinkedIn mention format', () => {
      const result = provider.mentionFormat('12345', 'Test Company');
      expect(result).toBe('@[Test Company](urn:li:organization:12345)');
    });

    it('should strip @ from name', () => {
      const result = provider.mentionFormat('12345', '@Test Company');
      expect(result).toBe('@[Test Company](urn:li:organization:12345)');
    });
  });
});
