import './setup';
import {
  SocialAbstract,
  RefreshToken,
  BadBody,
  NotEnoughScopes,
} from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { createMockResponse } from './factories';
import { timer } from '@gitroom/helpers/utils/timer';

// Concrete subclass for testing the abstract class
class TestableProvider extends SocialAbstract {
  identifier = 'test-provider';
}

// Subclass with custom handleErrors
class TestableProviderWithErrors extends SocialAbstract {
  identifier = 'test-provider-errors';

  override handleErrors(
    body: string
  ):
    | { type: 'refresh-token' | 'bad-body' | 'retry'; value: string }
    | undefined {
    if (body.includes('please_retry')) {
      return { type: 'retry', value: 'Retrying...' };
    }
    if (body.includes('token_expired')) {
      return { type: 'refresh-token', value: 'Token expired' };
    }
    if (body.includes('invalid_content')) {
      return { type: 'bad-body', value: 'Invalid content' };
    }
    return undefined;
  }
}

describe('SocialAbstract', () => {
  let provider: TestableProvider;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    provider = new TestableProvider();
    originalFetch = global.fetch;
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('fetch()', () => {
    it('should return response on 200 status', async () => {
      const mockResponse = createMockResponse({ data: 'ok' }, 200);
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      const result = await provider.fetch('https://api.example.com/test');
      expect(result).toBe(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        {}
      );
    });

    it('should return response on 201 status', async () => {
      const mockResponse = createMockResponse({ data: 'created' }, 201);
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      const result = await provider.fetch('https://api.example.com/create');
      expect(result.status).toBe(201);
    });

    it('should retry on 429 status and use timer', async () => {
      const retryResponse = createMockResponse('rate limited', 429);
      const successResponse = createMockResponse({ data: 'ok' }, 200);
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(retryResponse)
        .mockResolvedValueOnce(successResponse);

      const result = await provider.fetch('https://api.example.com/test');
      expect(result.status).toBe(200);
      expect(timer).toHaveBeenCalledWith(5000);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on 500 status', async () => {
      const errorResponse = createMockResponse('server error', 500);
      const successResponse = createMockResponse({ data: 'ok' }, 200);
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(errorResponse)
        .mockResolvedValueOnce(successResponse);

      const result = await provider.fetch('https://api.example.com/test');
      expect(result.status).toBe(200);
      expect(timer).toHaveBeenCalledWith(5000);
    });

    it('should retry when body contains rate_limit_exceeded', async () => {
      const rateLimitResponse = createMockResponse(
        'rate_limit_exceeded',
        403
      );
      const successResponse = createMockResponse({ data: 'ok' }, 200);
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(rateLimitResponse)
        .mockResolvedValueOnce(successResponse);

      const result = await provider.fetch('https://api.example.com/test');
      expect(result.status).toBe(200);
    });

    it('should throw BadBody after max 3 retries', async () => {
      const errorResponse = createMockResponse('server error', 500);
      global.fetch = jest.fn().mockResolvedValue(errorResponse);

      await expect(
        provider.fetch('https://api.example.com/test')
      ).rejects.toThrow();

      // Initial call + 3 retries = should stop at totalRetries > 2
      expect(global.fetch).toHaveBeenCalledTimes(4);
    });

    it('should throw RefreshToken on 401 status without handleErrors', async () => {
      const unauthorizedResponse = createMockResponse('unauthorized', 401);
      global.fetch = jest.fn().mockResolvedValue(unauthorizedResponse);

      await expect(
        provider.fetch('https://api.example.com/test')
      ).rejects.toThrow(RefreshToken);
    });

    it('should handle text() error by defaulting to {}', async () => {
      const errorResponse = {
        status: 403,
        ok: false,
        headers: new Headers(),
        text: jest.fn().mockRejectedValue(new Error('text failed')),
        json: jest.fn(),
      } as unknown as Response;
      global.fetch = jest.fn().mockResolvedValue(errorResponse);

      await expect(
        provider.fetch('https://api.example.com/test', {}, 'test')
      ).rejects.toThrow(BadBody);
    });

    it('should retry when handleErrors returns retry type', async () => {
      const providerWithErrors = new TestableProviderWithErrors();
      const retryResponse = createMockResponse('please_retry', 400);
      const successResponse = createMockResponse({ data: 'ok' }, 200);
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(retryResponse)
        .mockResolvedValueOnce(successResponse);

      const result = await providerWithErrors.fetch(
        'https://api.example.com/test'
      );
      expect(result.status).toBe(200);
      expect(timer).toHaveBeenCalledWith(5000);
    });

    it('should throw RefreshToken when handleErrors returns refresh-token on any status', async () => {
      const providerWithErrors = new TestableProviderWithErrors();
      const errorResponse = createMockResponse('token_expired', 403);
      global.fetch = jest.fn().mockResolvedValue(errorResponse);

      await expect(
        providerWithErrors.fetch('https://api.example.com/test')
      ).rejects.toThrow(RefreshToken);
    });

    it('should throw BadBody when handleErrors returns bad-body', async () => {
      const providerWithErrors = new TestableProviderWithErrors();
      const errorResponse = createMockResponse('invalid_content', 400);
      global.fetch = jest.fn().mockResolvedValue(errorResponse);

      await expect(
        providerWithErrors.fetch('https://api.example.com/test')
      ).rejects.toThrow(BadBody);
    });
  });

  describe('checkScopes()', () => {
    it('should return true when array scopes match', () => {
      expect(
        provider.checkScopes(['read', 'write'], ['read', 'write', 'admin'])
      ).toBe(true);
    });

    it('should throw NotEnoughScopes when array scopes do not match', () => {
      expect(() =>
        provider.checkScopes(['read', 'write', 'admin'], ['read'])
      ).toThrow(NotEnoughScopes);
    });

    it('should handle comma-separated string scopes', () => {
      expect(provider.checkScopes(['read', 'write'], 'read,write,admin')).toBe(
        true
      );
    });

    it('should handle space-separated string scopes', () => {
      expect(provider.checkScopes(['read', 'write'], 'read write admin')).toBe(
        true
      );
    });

    it('should handle URL-encoded string scopes', () => {
      expect(
        provider.checkScopes(
          ['read', 'write'],
          encodeURIComponent('read,write,admin')
        )
      ).toBe(true);
    });

    it('should throw NotEnoughScopes when string scopes are insufficient', () => {
      expect(() =>
        provider.checkScopes(['read', 'write', 'admin'], 'read,write')
      ).toThrow(NotEnoughScopes);
    });

    it('should pass with empty required scopes', () => {
      expect(provider.checkScopes([], 'anything')).toBe(true);
    });
  });

  describe('runInConcurrent()', () => {
    it('should pass through successful result', async () => {
      const result = await provider.runInConcurrent(async () => ({
        data: 'success',
      }));
      expect(result).toEqual({ data: 'success' });
    });

    it('should throw RefreshToken when handleErrors returns refresh-token', async () => {
      const providerWithErrors = new TestableProviderWithErrors();

      // Must throw an object that serializes to contain 'token_expired'
      // since runInConcurrent uses safeStringify(err) which calls JSON.stringify
      // (Error properties are not enumerable so new Error('x') stringifies to '{}')
      await expect(
        providerWithErrors.runInConcurrent(async () => {
          throw { error: 'token_expired', statusCode: 401 };
        })
      ).rejects.toThrow(RefreshToken);
    });

    it('should throw BadBody for unknown errors', async () => {
      await expect(
        provider.runInConcurrent(async () => {
          throw new Error('something went wrong');
        })
      ).rejects.toThrow(BadBody);
    });

    it('should throw BadBody when handleErrors returns bad-body', async () => {
      const providerWithErrors = new TestableProviderWithErrors();

      await expect(
        providerWithErrors.runInConcurrent(async () => {
          throw { error: 'invalid_content' };
        })
      ).rejects.toThrow(BadBody);
    });
  });

  describe('handleErrors() default implementation', () => {
    it('should return undefined by default', () => {
      expect(provider.handleErrors('any error body')).toBeUndefined();
    });
  });

  describe('Error classes', () => {
    it('RefreshToken should be an instance of ApplicationFailure', () => {
      const err = new RefreshToken('test-id', '{}', '{}' as any, 'test msg');
      expect(err).toBeInstanceOf(RefreshToken);
      expect(err.type).toBe('refresh_token');
      expect(err.message).toBe('test msg');
    });

    it('BadBody should be an instance of ApplicationFailure', () => {
      const err = new BadBody('test-id', '{}', '{}' as any, 'bad body msg');
      expect(err).toBeInstanceOf(BadBody);
      expect(err.type).toBe('bad_body');
      expect(err.message).toBe('bad body msg');
    });

    it('NotEnoughScopes should have default message', () => {
      const err = new NotEnoughScopes();
      expect(err.message).toBe(
        'Not enough scopes, when choosing a provider, please add all the scopes'
      );
    });

    it('NotEnoughScopes should accept custom message', () => {
      const err = new NotEnoughScopes('Custom message');
      expect(err.message).toBe('Custom message');
    });
  });

  describe('maxConcurrentJob', () => {
    it('should default to 1', () => {
      expect(provider.maxConcurrentJob).toBe(1);
    });
  });

  describe('mention() default implementation', () => {
    it('should return { none: true } by default', async () => {
      const result = await provider.mention(
        'token',
        { query: 'test' },
        'id',
        {} as any
      );
      expect(result).toEqual({ none: true });
    });
  });
});
