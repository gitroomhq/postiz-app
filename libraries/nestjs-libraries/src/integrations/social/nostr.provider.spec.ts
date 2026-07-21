/**
 * Unit tests for Nostr multi-account repost (issue #1586).
 *
 * Fully offline: nostr-tools and AuthService are mocked so no relay sockets
 * open. SocialAbstract is stubbed to avoid pulling in sharp/temporal.
 *
 * Run with:
 *   npx jest --config libraries/nestjs-libraries/jest.config.js
 */

jest.mock('@gitroom/nestjs-libraries/integrations/social.abstract', () => ({
  SocialAbstract: class {},
}));

jest.mock('@gitroom/helpers/auth/auth.service', () => ({
  AuthService: {
    verifyJWT: jest.fn(),
    signJWT: jest.fn(() => 'signed-jwt'),
  },
}));

const relayInstance = {
  subscribe: jest.fn((_filters: any, handlers: any) => {
    handlers.oneose?.();
    return { close: jest.fn() };
  }),
  publish: jest.fn().mockResolvedValue(undefined),
  close: jest.fn(),
};

jest.mock('nostr-tools', () => ({
  __esModule: true,
  getPublicKey: jest.fn(() => 'reposter-pubkey'),
  finalizeEvent: jest.fn(),
  Relay: { connect: jest.fn() },
  SimplePool: jest.fn().mockImplementation(() => ({ get: jest.fn() })),
}));

import { NostrProvider } from './nostr.provider';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { finalizeEvent, Relay } from 'nostr-tools';
import type { Integration } from '@prisma/client';

const finalizeEventMock = finalizeEvent as jest.Mock;
const relayConnectMock = Relay.connect as jest.Mock;
const verifyJWTMock = AuthService.verifyJWT as jest.Mock;

/** 32-byte zero key as 64 hex chars — enough for toSecretKey to parse. */
const HEX_SECRET =
  '0000000000000000000000000000000000000000000000000000000000000001';

describe('NostrProvider.repostPostUsers', () => {
  const reposter = {
    internalId: 'reposter-pubkey-hex',
    token: 'reposter-jwt-token',
  } as Integration;

  const original = {
    internalId: 'author-pubkey-hex',
    token: 'author-jwt-token',
  } as Integration;

  const postId = 'original-note-event-id';
  const signedEvent = { id: 'signed-repost-id', kind: 6 };

  beforeEach(() => {
    jest.clearAllMocks();
    verifyJWTMock.mockReturnValue({ password: HEX_SECRET });
    finalizeEventMock.mockReturnValue(signedEvent);
    relayConnectMock.mockResolvedValue(relayInstance);
  });

  it('builds and publishes a NIP-18 kind:6 repost signed by the reposting account', async () => {
    const provider = new NostrProvider();

    await provider.repostPostUsers(reposter, original, postId, {});

    expect(verifyJWTMock).toHaveBeenCalledWith(reposter.token);

    expect(finalizeEventMock).toHaveBeenCalledTimes(1);
    const [eventTemplate, secretKey] = finalizeEventMock.mock.calls[0];
    expect(eventTemplate.kind).toBe(6);
    expect(eventTemplate.content).toBe('');
    expect(eventTemplate.tags[0][0]).toBe('e');
    expect(eventTemplate.tags[0][1]).toBe(postId);
    // relay hint present (NIP-18)
    expect(typeof eventTemplate.tags[0][2]).toBe('string');
    expect(eventTemplate.tags[0][2].startsWith('wss://')).toBe(true);
    expect(eventTemplate.tags[1]).toEqual(['p', original.internalId]);

    // Secret key is a Uint8Array (not the raw hex string).
    expect(secretKey).toBeInstanceOf(Uint8Array);
    expect(secretKey).toHaveLength(32);

    // Broadcast reached every configured relay (parallel publish).
    expect(relayConnectMock).toHaveBeenCalled();
    expect(relayInstance.publish).toHaveBeenCalledWith(signedEvent);
    // No kind:1 subscription wait for reposts.
    expect(relayInstance.subscribe).not.toHaveBeenCalled();
    expect(relayInstance.close).toHaveBeenCalled();
  });

  it('no-ops when postId is empty (broken upstream publish would otherwise create invalid events)', async () => {
    const provider = new NostrProvider();

    await provider.repostPostUsers(reposter, original, '', {});

    expect(finalizeEventMock).not.toHaveBeenCalled();
    expect(relayConnectMock).not.toHaveBeenCalled();
  });

  it('swallows relay failures so one bad account does not fail the post (mirrors X)', async () => {
    relayConnectMock.mockRejectedValue(new Error('relay unreachable'));
    const provider = new NostrProvider();

    await expect(
      provider.repostPostUsers(reposter, original, postId, {})
    ).resolves.toBeUndefined();

    expect(finalizeEventMock).toHaveBeenCalledTimes(1);
  });
});

describe('NostrProvider.post', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyJWTMock.mockReturnValue({ password: HEX_SECRET });
    finalizeEventMock.mockReturnValue({ id: 'deterministic-note-id', kind: 1 });
    relayConnectMock.mockResolvedValue(relayInstance);
  });

  it('returns the finalizeEvent id as postId so multi-account reposts have a stable target', async () => {
    const provider = new NostrProvider();

    const result = await provider.post('author-pubkey', 'token', [
      {
        id: 'local-post-id',
        message: 'hello nostr',
        media: [],
        settings: {},
      } as any,
    ]);

    expect(result[0].postId).toBe('deterministic-note-id');
    expect(result[0].releaseURL).toContain('deterministic-note-id');
  });
});
