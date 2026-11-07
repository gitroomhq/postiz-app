import { describe, expect, it, vi } from 'vitest';

vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
  withHeartbeat: (fn: unknown) => fn,
}));

import { BadBody, NotEnoughScopes } from '../social.abstract';
import { DiscordProvider } from './discord.provider';

/**
 * Discord is the plain this.fetch baseline: no vendor SDK and no pending state
 * machine, so it is the cheapest place to prove that SocialAbstract's retry and
 * classification wiring works through a real provider.
 */
describe('DiscordProvider.handleErrors', () => {
  const provider = new DiscordProvider();

  it.each([
    ['50001', "Bot doesn't have access to this channel"],
    ['50013', 'Bot lacks permission to send messages in this channel'],
    ['10003', 'Channel no longer exists'],
    ['40005', "Attachment exceeds Discord's size limit"],
  ])('maps Discord code %s to a terminal bad-body', (code, message) => {
    expect(provider.handleErrors(`{"code":${code}}`)).toEqual({
      type: 'bad-body',
      value: message,
    });
  });

  it('maps the rate-limit code to a retry rather than a failure', () => {
    expect(provider.handleErrors('{"code":20028}')).toEqual({
      type: 'retry',
      value: 'Rate limited by Discord',
    });
  });

  it('leaves an unrecognised body unclassified', () => {
    expect(provider.handleErrors('{"code":99999}')).toBeUndefined();
  });
});

describe('DiscordProvider through SocialAbstract.fetch', () => {
  const provider = new DiscordProvider();

  it('turns a permission error into a terminal BadBody without retrying', async () => {
    const fetchMock = vi.fn(
      async () => new Response('{"code":50013}', { status: 403 })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      provider.fetch('https://discord.com/api/channels/1/messages', {
        method: 'POST',
      })
    ).rejects.toBeInstanceOf(BadBody);

    // A classified bad-body must not be retried: the message may already be
    // posted, and Discord will keep rejecting it anyway.
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('retries a rate-limit code and succeeds on a later attempt', async () => {
    let attempt = 0;
    const fetchMock = vi.fn(async () =>
      attempt++ === 0
        ? new Response('{"code":20028}', { status: 429 })
        : new Response('{"id":"message-1"}', { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await provider.fetch(
      'https://discord.com/api/channels/1/messages',
      { method: 'POST' }
    );

    expect(await response.json()).toEqual({ id: 'message-1' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('DiscordProvider scopes', () => {
  const provider = new DiscordProvider();

  it('accepts the scopes it asks for', () => {
    expect(provider.checkScopes(provider.scopes, 'identify guilds')).toBe(true);
  });

  it('rejects a partial grant', () => {
    expect(() => provider.checkScopes(provider.scopes, 'identify')).toThrow(
      NotEnoughScopes
    );
  });
});
