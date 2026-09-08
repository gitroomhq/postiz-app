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

describe('SocialAbstract defaults', () => {
  class Bare extends SocialAbstract {
    identifier = 'bare';
  }
  const provider = new Bare();

  it('classifies nothing, so a provider that overrides nothing falls through', () => {
    expect(provider.handleErrors('anything', 500)).toBeUndefined();
  });

  it('accepts any media, so validation is opt-in per provider', async () => {
    await expect(provider.checkValidity([[{ path: '/a.jpg' }]], {}, [])).resolves.toBe(true);
  });

  it('reports no mention support', async () => {
    await expect(
      provider.mention('token', { query: 'x' }, 'id', {} as never)
    ).resolves.toEqual({ none: true });
  });

  it.each([
    ['checkPostStatus'],
    ['finalizePost'],
  ])('fails loudly when %s is reached without an override', async (method) => {
    // A provider that returns `pending` without implementing these would
    // otherwise complete with a bogus releaseURL on the first real post.
    await expect(
      (provider as any)[method]('token', {}, {} as never)
    ).rejects.toBeInstanceOf(BadBody);
  });

  it.each([
    ['true', true],
    ['TRUE', true],
    ['false', false],
    ['anything else', false],
  ])('reads the string %j from a settings form as %s', (value, expected) => {
    // Settings arrive from a form as strings; treating "false" as truthy is
    // how a disabled option ends up enabled on the platform.
    expect((provider as any).assetBoolean(value)).toBe(expected);
  });

  it('passes a real boolean through', () => {
    expect((provider as any).assetBoolean(true)).toBe(true);
    expect((provider as any).assetBoolean(false)).toBe(false);
  });

  it('treats a missing value as false', () => {
    expect((provider as any).assetBoolean(undefined as never)).toBe(false);
  });
});

describe('SocialAbstract.mediaSize', () => {
  class Bare extends SocialAbstract {
    identifier = 'bare';
  }
  const provider = new Bare();

  const head = (init: ResponseInit & { length?: string } = {}) => {
    const { length, ...rest } = init;
    return new Response(null, {
      ...rest,
      headers: length === undefined ? {} : { 'content-length': length },
    });
  };

  it('reads the length from a HEAD request for a remote file', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => head({ status: 200, length: '2048' })));

    await expect((provider as any).mediaSize('https://media.test/a.mp4')).resolves.toBe(2048);
  });

  it('asks for identity encoding so the size matches the bytes a GET streams', async () => {
    const fetchMock = vi.fn(async (..._args: any[]) => head({ status: 200, length: '10' }));
    vi.stubGlobal('fetch', fetchMock);

    await (provider as any).mediaSize('https://media.test/a.mp4');

    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'HEAD',
      headers: { 'accept-encoding': 'identity' },
    });
  });

  it('refuses a content-length that came with a failed HEAD', async () => {
    // A 404 page has a length too; using it would poison every chunk offset.
    vi.stubGlobal('fetch', vi.fn(async () => head({ status: 404, length: '57' })));

    await expect(
      (provider as any).mediaSize('https://media.test/a.mp4')
    ).rejects.toBeInstanceOf(BadBody);
  });

  it.each([
    ['a missing length', undefined],
    ['a zero length', '0'],
    ['a non-numeric length', 'lots'],
  ])('refuses %s', async (_label, length) => {
    vi.stubGlobal('fetch', vi.fn(async () => head({ status: 200, length })));

    await expect(
      (provider as any).mediaSize('https://media.test/a.mp4')
    ).rejects.toBeInstanceOf(BadBody);
  });
});

describe('SocialAbstract.mediaChunk', () => {
  class Bare extends SocialAbstract {
    identifier = 'bare';
  }
  const provider = new Bare();

  it('returns the requested byte range', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('abcdefgh', { status: 206 }))
    );

    const chunk = await (provider as any).mediaChunk('https://media.test/a.mp4', 0, 7);

    expect(chunk.toString()).toBe('abcdefgh');
  });

  it('refuses a server that ignored the range header', async () => {
    // Buffering the body here would load the whole file and upload corrupt
    // chunks at every offset but the first.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('the whole file', { status: 200 }))
    );

    const error = await (provider as any)
      .mediaChunk('https://media.test/a.mp4', 10, 20)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadBody);
    expect(error.message).toContain('range request');
  });
});

describe('SocialAbstract.mediaStream', () => {
  class Bare extends SocialAbstract {
    identifier = 'bare';
  }
  const provider = new Bare();

  it('streams a remote file with identity encoding', async () => {
    const fetchMock = vi.fn(async (..._args: any[]) => new Response('bytes', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const stream = await (provider as any).mediaStream('https://media.test/a.mp4');

    expect(typeof stream.pipe).toBe('function');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      headers: { 'accept-encoding': 'identity' },
    });
  });

  it('refuses a media url that does not answer', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 500 })));

    await expect(
      (provider as any).mediaStream('https://media.test/a.mp4')
    ).rejects.toBeInstanceOf(BadBody);
  });
});

describe('SocialAbstract.runStreamedUpload', () => {
  class Classifying extends SocialAbstract {
    identifier = 'classifying';
    override handleErrors(body: string) {
      if (body.includes('slow down')) return { type: 'retry' as const, value: 'Slow down' };
      if (body.includes('capped')) return { type: 'disconnect' as const, value: 'Capped' };
      if (body.includes('expired')) return { type: 'refresh-token' as const, value: 'Expired' };
      return undefined;
    }
  }
  const provider = new Classifying();

  const responseError = (status: number, data: unknown) =>
    Object.assign(new Error('request failed'), { response: { status, data } });

  it('returns the value of a successful upload', async () => {
    await expect(
      (provider as any).runStreamedUpload(async () => 'uploaded')
    ).resolves.toBe('uploaded');
  });

  it('rethrows an error that carries no response, untouched', async () => {
    const original = new Error('socket hang up');

    // Temporal's own retry policy should keep handling these.
    await expect((provider as any).runStreamedUpload(async () => { throw original; }))
      .rejects.toBe(original);
  });

  it('rebuilds the request on a retry rather than replaying a spent stream', async () => {
    let attempt = 0;
    const func = vi.fn(async () => {
      if (attempt++ === 0) throw responseError(429, 'too many');
      return 'uploaded';
    });

    await expect((provider as any).runStreamedUpload(func)).resolves.toBe('uploaded');
    expect(func).toHaveBeenCalledTimes(2);
  });

  it('retries an unclassified 500', async () => {
    const func = vi.fn(async () => {
      throw responseError(500, 'boom');
    });

    await expect((provider as any).runStreamedUpload(func)).rejects.toBeInstanceOf(BadBody);
    expect(func).toHaveBeenCalledTimes(4);
  });

  it('retries a body the provider marks retryable', async () => {
    const func = vi.fn(async () => {
      throw responseError(400, 'slow down');
    });

    await expect((provider as any).runStreamedUpload(func)).rejects.toBeInstanceOf(BadBody);
    expect(func).toHaveBeenCalledTimes(4);
  });

  it('disconnects the channel when the provider says so', async () => {
    await expect(
      (provider as any).runStreamedUpload(async () => {
        throw responseError(400, 'capped');
      })
    ).rejects.toBeInstanceOf(Disconnect);
  });

  it('asks for a reconnect on a classified token failure', async () => {
    await expect(
      (provider as any).runStreamedUpload(async () => {
        throw responseError(400, 'expired');
      })
    ).rejects.toBeInstanceOf(RefreshToken);
  });

  it('treats an unclassified 401 as a token failure', async () => {
    await expect(
      (provider as any).runStreamedUpload(async () => {
        throw responseError(401, 'nope');
      })
    ).rejects.toBeInstanceOf(RefreshToken);
  });

  it('reports anything else as a terminal failure', async () => {
    await expect(
      (provider as any).runStreamedUpload(async () => {
        throw responseError(422, { message: 'unprocessable' });
      })
    ).rejects.toBeInstanceOf(BadBody);
  });
});

describe('SocialAbstract.runInConcurrent', () => {
  class Classifying extends SocialAbstract {
    identifier = 'classifying';
    override handleErrors(body: string) {
      if (body.includes('expired')) return { type: 'refresh-token' as const, value: 'Expired' };
      if (body.includes('capped')) return { type: 'disconnect' as const, value: 'Capped' };
      return undefined;
    }
  }
  const provider = new Classifying();

  it('returns the value when nothing went wrong', async () => {
    await expect(provider.runInConcurrent(async () => ({ ok: true }))).resolves.toEqual({
      ok: true,
    });
  });

  it('turns a classified token failure into a RefreshToken', async () => {
    await expect(
      provider.runInConcurrent(async () => {
        throw { message: 'expired' };
      })
    ).rejects.toBeInstanceOf(RefreshToken);
  });

  it('turns a classified cap into a Disconnect', async () => {
    await expect(
      provider.runInConcurrent(async () => {
        throw { message: 'capped' };
      })
    ).rejects.toBeInstanceOf(Disconnect);
  });

  it('cannot classify a thrown Error, because JSON.stringify empties it', async () => {
    // Characterisation. runInConcurrent classifies on safeStringify(err), and
    // an Error serialises to "{}" - so a provider that throws `new Error(...)`
    // here always lands on BadBody, never on refresh-token or disconnect,
    // however specific its message is.
    await expect(
      provider.runInConcurrent(async () => {
        throw new Error('expired');
      })
    ).rejects.toBeInstanceOf(BadBody);
  });

  it('reports an unclassified failure as a terminal one', async () => {
    await expect(
      provider.runInConcurrent(async () => {
        throw new Error('something new');
      })
    ).rejects.toBeInstanceOf(BadBody);
  });
});
