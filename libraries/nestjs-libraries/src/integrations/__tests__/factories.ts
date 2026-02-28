import type {
  PostDetails,
  PostResponse,
  MediaContent,
  AuthTokenDetails,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import type { Integration } from '@prisma/client';

export function createPostDetails<T = any>(
  overrides: Partial<PostDetails<T>> = {}
): PostDetails<T> {
  return {
    id: 'test-post-id',
    message: 'Test post message',
    settings: {} as T,
    media: [],
    ...overrides,
  };
}

export function createMediaContent(
  overrides: Partial<MediaContent> = {}
): MediaContent {
  return {
    type: 'image',
    path: 'https://example.com/test-image.jpg',
    ...overrides,
  };
}

export function createIntegration(
  overrides: Partial<Integration> = {}
): Integration {
  return {
    id: 'test-integration-id',
    internalId: 'test-internal-id',
    organizationId: 'test-org-id',
    name: 'Test Integration',
    picture: 'https://example.com/pic.jpg',
    providerIdentifier: 'test-provider',
    type: 'social',
    token: 'test-access-token',
    refreshToken: 'test-refresh-token',
    expiresIn: 3600,
    profile: 'test-profile',
    deletedAt: null,
    refreshNeeded: false,
    inBetweenSteps: false,
    disabled: false,
    tokenExpireDate: new Date(),
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    customInstanceDetails: null,
    additionalSettings: null,
    ...overrides,
  } as Integration;
}

export function createAuthTokenDetails(
  overrides: Partial<AuthTokenDetails> = {}
): AuthTokenDetails {
  return {
    id: 'test-auth-id',
    name: 'Test User',
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    expiresIn: 3600,
    picture: 'https://example.com/avatar.jpg',
    username: 'testuser',
    ...overrides,
  };
}

export function createPostResponse(
  overrides: Partial<PostResponse> = {}
): PostResponse {
  return {
    id: 'test-post-id',
    postId: 'platform-post-id',
    releaseURL: 'https://example.com/post/123',
    status: 'posted',
    ...overrides,
  };
}

export function createMockResponse(
  body: any = {},
  status = 200,
  headers: Record<string, string> = {}
): Response {
  const headersObj = new Headers(headers);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: headersObj,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(
      typeof body === 'string' ? body : JSON.stringify(body)
    ),
    blob: jest.fn().mockResolvedValue(new Blob()),
    clone: jest.fn(),
    arrayBuffer: jest.fn(),
    formData: jest.fn(),
    body: null,
    bodyUsed: false,
    redirected: false,
    type: 'basic' as ResponseType,
    url: '',
    bytes: jest.fn(),
  } as unknown as Response;
}

export function mockFetchSequence(responses: Response[]): jest.Mock {
  const mock = jest.fn();
  responses.forEach((response, index) => {
    mock.mockResolvedValueOnce(response);
  });
  return mock;
}
