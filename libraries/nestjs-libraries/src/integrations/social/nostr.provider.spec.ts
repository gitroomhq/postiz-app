/**
 * Unit test for NostrProvider.repostPostUsers (issue #1586).
 *
 * Runs fully offline: nostr-tools is mocked so no relay socket is ever opened,
 * AuthService.verifyJWT is mocked to return a known private key, and the heavy
 * SocialAbstract parent (which pulls in sharp/temporal) is stubbed out.
 *
 * Run directly with:
 *   npx jest --config libraries/nestjs-libraries/jest.config.ts
 */

// Stub the abstract base so importing the provider doesn't drag in sharp,
// @temporalio/activity, etc. repostPostUsers only relies on its own members.
jest.mock(
  '@gitroom/nestjs-libraries/integrations/social.abstract',
  () => ({
    SocialAbstract: class {},
  })
);

jest.mock('@gitroom/helpers/auth/auth.service', () => ({
  AuthService: {
    verifyJWT: jest.fn(),
    signJWT: jest.fn(() => 'signed-jwt'),
  },
}));

// A single shared relay instance, reused for every relay in the provider's list.
const relayInstance = {
  subscribe: jest.fn((_filters: any, handlers: any) => {
    // Immediately signal end-of-stored-events so publish()'s internal wait
    // resolves without any network round-trip.
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
import { Integration } from '@prisma/client';

const finalizeEventMock = finalizeEvent as jest.Mock;
const relayConnectMock = Relay.connect as jest.Mock;
const verifyJWTMock = AuthService.verifyJWT as jest.Mock;

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
    verifyJWTMock.mockReturnValue({ password: 'reposter-private-key' });
    finalizeEventMock.mockReturnValue(signedEvent);
    relayConnectMock.mockResolvedValue(relayInstance);
  });

  it('builds and publishes a NIP-18 kind:6 repost signed by the reposting account', async () => {
    const provider = new NostrProvider();
    const publishSpy = jest.spyOn(provider as any, 'publish');

    await provider.repostPostUsers(reposter, original, postId, {});

    // Decodes the reposting account's private key from its own token.
    expect(verifyJWTMock).toHaveBeenCalledWith(reposter.token);

    // Builds exactly one kind:6 event with NIP-18 e/p tags, no content.
    expect(finalizeEventMock).toHaveBeenCalledTimes(1);
    const [eventTemplate, secretKey] = finalizeEventMock.mock.calls[0];
    expect(eventTemplate.kind).toBe(6);
    expect(eventTemplate.content).toBe('');
    expect(eventTemplate.tags).toEqual([
      ['e', postId],
      ['p', original.internalId],
    ]);

    // Signed with the decoded reposting-account private key.
    expect(secretKey).toBe('reposter-private-key');

    // Published under the reposting account's pubkey, with the finalized event.
    expect(publishSpy).toHaveBeenCalledWith(reposter.internalId, signedEvent);

    // The publish reached the (mocked) relay layer — never a real socket.
    expect(relayConnectMock).toHaveBeenCalled();
    expect(relayInstance.publish).toHaveBeenCalledWith(signedEvent);
    expect(relayInstance.subscribe).toHaveBeenCalledWith(
      [{ kinds: [1], authors: [reposter.internalId] }],
      expect.any(Object)
    );
  });

  it('returns void and swallows relay failures (mirrors the X version)', async () => {
    relayConnectMock.mockRejectedValue(new Error('relay unreachable'));
    const provider = new NostrProvider();

    await expect(
      provider.repostPostUsers(reposter, original, postId, {})
    ).resolves.toBeUndefined();

    // Event was still constructed even though no relay accepted it.
    expect(finalizeEventMock).toHaveBeenCalledTimes(1);
  });
});
