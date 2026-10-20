import { vi } from 'vitest';

type Recorded = { url: string; init: RequestInit };
type Responder = (call: Recorded) => unknown;
type Route = [matcher: string | RegExp, respond: Responder];

/**
 * Route `globalThis.fetch` by URL for a provider test.
 *
 * SocialAbstract.fetch and every provider's raw `fetch` call go through the
 * global, so stubbing it here leaves provider code - request building, auth
 * headers, error parsing - running exactly as it does in production. A
 * responder may return a Response for full control, or any value to be sent
 * back as JSON.
 *
 * An unrouted URL throws rather than silently resolving: a provider quietly
 * talking to an endpoint the test does not know about is the bug this catches.
 */
export function stubFetch(routes: Route[]) {
  const calls: Recorded[] = [];

  const matches = (matcher: string | RegExp, url: string) =>
    typeof matcher === 'string' ? url.includes(matcher) : matcher.test(url);

  const mock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === 'string' ? input : String((input as Request).url ?? input);
    calls.push({ url, init });

    const route = routes.find(([matcher]) => matches(matcher, url));
    if (!route) {
      throw new Error(`Unstubbed ${init.method || 'GET'} to ${url}`);
    }

    const result = await route[1]({ url, init });
    return result instanceof Response ? result : Response.json(result ?? {});
  });

  vi.stubGlobal('fetch', mock);

  return {
    calls,
    mock,
    /** Every URL requested, in order - handy for asserting a call sequence. */
    urls: () => calls.map((c) => c.url),
    /** The parsed JSON body of the nth call whose URL matches. */
    body: (matcher: string | RegExp, nth = 0) => {
      const call = calls.filter((c) => matches(matcher, c.url))[nth];
      return call?.init?.body ? JSON.parse(String(call.init.body)) : undefined;
    },
    countTo: (matcher: string | RegExp) =>
      calls.filter((c) => matches(matcher, c.url)).length,
  };
}
