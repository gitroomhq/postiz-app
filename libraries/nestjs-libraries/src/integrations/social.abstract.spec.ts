import { beforeEach, describe, expect, it, vi } from 'vitest';

// this.fetch() sleeps 5s between retries. Never let real time into a unit test.
vi.mock('@gitroom/helpers/utils/timer', () => ({
  timer: vi.fn(async () => {}),
}));

// Records the call for Temporal; irrelevant here and pulls in @temporalio/activity
// context that does not exist outside a real activity.
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
}));

import {
  BadBody,
  Disconnect,
  NotEnoughScopes,
  RefreshToken,
  SocialAbstract,
  stripQuery,
  truncateForTemporal,
} from './social.abstract';

describe('truncateForTemporal', () => {
  it('returns an empty string for null and undefined', () => {
    expect(truncateForTemporal(null, 10)).toBe('');
    expect(truncateForTemporal(undefined, 10)).toBe('');
  });

  it('passes through falsy-but-present values via safeStringify', () => {
    // The nullish guard deliberately lets these through - dropping them would
    // hide a provider that answered `0` or `false`.
    expect(truncateForTemporal(0, 10)).toBe('0');
    expect(truncateForTemporal(false, 10)).toBe('false');
  });

  it('returns a string of exactly `max` length untouched', () => {
    const exact = 'a'.repeat(100);

    expect(truncateForTemporal(exact, 100)).toBe(exact);
    expect(truncateForTemporal(exact, 100)).not.toContain('truncated');
  });

  it('truncates at max + 1 and reports the number of dropped characters', () => {
    const result = truncateForTemporal('a'.repeat(101), 100);

    expect(result).toBe(`${'a'.repeat(100)}… [truncated 1 chars]`);
  });

  it('serialises objects before measuring them', () => {
    expect(truncateForTemporal({ a: 1 }, 100)).toBe('{"a":1}');
  });

  it('survives circular objects instead of throwing', () => {
    const circular: Record<string, unknown> = { name: 'root' };
    circular.self = circular;

    expect(truncateForTemporal(circular, 1000)).toContain('[Circular]');
  });
});

describe('ApplicationFailure subclasses', () => {
  const cases = [
    ['RefreshToken', RefreshToken, 'refresh_token'],
    ['Disconnect', Disconnect, 'disconnect'],
    ['BadBody', BadBody, 'bad_body'],
  ] as const;

  it.each(cases)('%s carries the right Temporal type', (_name, Klass, type) => {
    const err = new Klass('x', '{}', '{}', 'boom');

    expect(err.type).toBe(type);
    // nonRetryable is what stops the Temporal SDK re-running the activity. A
    // regression here silently republishes posts.
    expect(err.nonRetryable).toBe(true);
    expect(err.message).toBe('boom');
  });

  it.each(cases)('%s caps message at 2000 and fields at 4000', (_name, Klass) => {
    const err = new Klass(
      'ident',
      'j'.repeat(4001),
      'b'.repeat(4001),
      'm'.repeat(2001)
    );
    const [details] = err.details as [
      { identifier: string; json: string; body: string }
    ];

    expect(err.message).toContain('… [truncated 1 chars]');
    expect(err.message.startsWith('m'.repeat(2000))).toBe(true);
    expect(details.identifier).toBe('ident');
    expect(details.json.startsWith('j'.repeat(4000))).toBe(true);
    expect(details.body.startsWith('b'.repeat(4000))).toBe(true);
  });

  it('keeps a huge failure well under the gRPC frame limit', () => {
    // The whole point of the caps: Temporal ships this in the workflow history
    // over gRPC, which has a 4MB frame limit.
    const err = new BadBody(
      'ident',
      'j'.repeat(500_000),
      'b'.repeat(500_000),
      'm'.repeat(500_000)
    );

    expect(JSON.stringify(err.details).length).toBeLessThan(9_000);
  });
});

describe('stripQuery', () => {
  it('drops the query string so tokens never reach Temporal history', () => {
    expect(stripQuery('https://api.example.com/p?access_token=SECRET')).toBe(
      'https://api.example.com/p'
    );
    expect(stripQuery('https://api.example.com/p?access_token=SECRET')).not.toContain(
      'SECRET'
    );
  });

  it('drops the fragment as well', () => {
    expect(stripQuery('https://api.example.com/p#frag')).toBe(
      'https://api.example.com/p'
    );
  });

  it('falls back to a plain split for non-URL input', () => {
    expect(stripQuery('not a url?x=1')).toBe('not a url');
  });
});

class TestProvider extends SocialAbstract {
  identifier = 'test-provider';
}

describe('checkScopes', () => {
  const provider = new TestProvider();

  it('accepts an array containing every required scope', () => {
    expect(provider.checkScopes(['a', 'b'], ['a', 'b', 'c'])).toBe(true);
  });

  it('throws NotEnoughScopes when an array is missing one', () => {
    expect(() => provider.checkScopes(['a', 'z'], ['a', 'b'])).toThrow(
      NotEnoughScopes
    );
  });

  it('accepts a space-delimited string', () => {
    expect(
      provider.checkScopes(['openid', 'w_member_social'], 'openid profile w_member_social')
    ).toBe(true);
  });

  it('accepts a comma-delimited string', () => {
    expect(provider.checkScopes(['identify', 'guilds'], 'identify,guilds')).toBe(true);
  });

  it('url-decodes before splitting', () => {
    expect(provider.checkScopes(['write:statuses'], 'write%3Astatuses%20profile')).toBe(
      true
    );
  });

  it('picks its delimiter by the presence of a comma', () => {
    // Characterisation, not endorsement: a mixed "a,b c" string splits on the
    // comma into ['a', 'b c'], so 'b' is not found. Pinned so that changing the
    // delimiter logic is a deliberate act rather than an accident.
    expect(() => provider.checkScopes(['b'], 'a,b c')).toThrow(NotEnoughScopes);
  });
});

describe('migrationMatch default', () => {
  const provider = new TestProvider();
  const integration = { profile: 'bob' } as never;

  it('matches on username', () => {
    expect(provider.migrationMatch({ id: '1', username: 'bob' }, integration)).toBe(
      true
    );
  });

  it('never matches an empty or missing username', () => {
    // Without the truthiness guard every channel with a null profile would
    // match every other one.
    expect(provider.migrationMatch({ id: '1', username: '' }, integration)).toBe(false);
    expect(
      provider.migrationMatch({ id: '1', username: undefined as never }, integration)
    ).toBe(false);
  });

  it('does not match a different username', () => {
    expect(provider.migrationMatch({ id: '1', username: 'alice' }, integration)).toBe(
      false
    );
  });
});

describe('SocialAbstract.fetch error classification', () => {
  const respond = (status: number, body = '{}') =>
    new Response(body, { status });

  let provider: TestProvider;

  beforeEach(() => {
    provider = new TestProvider();
  });

  it('returns 200 and 201 responses untouched without classifying', () => {
    const handleErrors = vi.spyOn(provider, 'handleErrors');

    return Promise.all(
      [200, 201].map(async (status) => {
        vi.stubGlobal('fetch', vi.fn(async () => respond(status)));

        const response = await provider.fetch('https://example.com');

        expect(response.status).toBe(status);
        expect(handleErrors).not.toHaveBeenCalled();
      })
    );
  });

  it('retries a 429 and gives up as BadBody carrying the real body', async () => {
    const fetchMock = vi.fn(async () => respond(429, 'slow down please'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(provider.fetch('https://example.com')).rejects.toBeInstanceOf(BadBody);
    // initial attempt + 3 retries, then totalRetries > 2 short-circuits
    expect(fetchMock).toHaveBeenCalledTimes(4);

    const error = await provider.fetch('https://example.com').catch((e) => e);
    expect((error.details[0] as { json: string }).json).toBe('slow down please');
  });

  it('retries a 500 that the provider does not classify', async () => {
    const fetchMock = vi.fn(async () => respond(500));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(provider, 'handleErrors').mockReturnValue(undefined as never);

    await expect(provider.fetch('https://example.com')).rejects.toBeInstanceOf(BadBody);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('does not retry a 500 the provider classifies as bad-body', async () => {
    const fetchMock = vi.fn(async () => respond(500));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(provider, 'handleErrors').mockReturnValue({
      type: 'bad-body',
      value: 'nope',
    } as never);

    await expect(provider.fetch('https://example.com')).rejects.toBeInstanceOf(BadBody);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries on a rate-limit body regardless of status', async () => {
    const fetchMock = vi.fn(async () => respond(400, 'rate_limit_exceeded'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(provider.fetch('https://example.com')).rejects.toBeInstanceOf(BadBody);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('classifies disconnect before the 401 refresh-token branch', async () => {
    // A 401 that the provider calls a disconnect must NOT become a token
    // refresh, or the channel silently retries forever instead of asking the
    // user to reconnect.
    vi.stubGlobal('fetch', vi.fn(async () => respond(401)));
    vi.spyOn(provider, 'handleErrors').mockReturnValue({
      type: 'disconnect',
      value: 'account gone',
    } as never);

    await expect(provider.fetch('https://example.com')).rejects.toBeInstanceOf(
      Disconnect
    );
  });

  it('treats an unclassified 401 as a refresh-token failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respond(401)));

    await expect(provider.fetch('https://example.com')).rejects.toBeInstanceOf(
      RefreshToken
    );
  });

  it('honours an explicit refresh-token classification on any status', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respond(403)));
    vi.spyOn(provider, 'handleErrors').mockReturnValue({
      type: 'refresh-token',
      value: 'expired',
    } as never);

    await expect(provider.fetch('https://example.com')).rejects.toBeInstanceOf(
      RefreshToken
    );
  });

  it('falls through to BadBody for anything else', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respond(418, 'teapot')));

    const error = await provider.fetch('https://example.com').catch((e) => e);

    expect(error).toBeInstanceOf(BadBody);
    expect(error.message).toBe('Unknown Error');
  });
});
