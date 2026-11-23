import { Agent, buildConnector } from 'undici';
import axios, { AxiosInstance } from 'axios';
import dns from 'node:dns';
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';
import { isBlockedIp } from './webhook.url.validator';

// Pins DNS resolution: every resolved IP is checked with `isBlockedIp` and
// the caller connects to that same set. Closes the TOCTOU window
// `isSafePublicHttpsUrl` alone leaves open (see GHSA-f7jj-p389-4w45).
function ssrfSafeLookup(
  hostname: string,
  options: any,
  callback: (
    err: NodeJS.ErrnoException | null,
    address: any,
    family?: number
  ) => void
) {
  // Defensive only: Node does not call `lookup` for IP literals, those are
  // rejected by `isBlockedLiteralHost` at connect time below
  if (net.isIP(hostname)) {
    const family = net.isIP(hostname);
    if (isBlockedIp(hostname)) {
      return callback(new Error('Blocked IP'), '', 0);
    }
    return options && (options as any).all
      ? callback(null, [{ address: hostname, family }] as any, family)
      : callback(null, hostname, family);
  }

  dns.lookup(hostname, options, (err, address: any, family: any) => {
    if (err) return callback(err, '', 0);
    if (Array.isArray(address)) {
      for (const entry of address) {
        if (isBlockedIp(entry.address)) {
          return callback(new Error('Blocked IP'), '', 0);
        }
      }
      return callback(null, address as any, 0);
    }
    if (isBlockedIp(address)) {
      return callback(new Error('Blocked IP'), '', 0);
    }
    callback(null, address, family);
  });
}

// Node never calls `lookup` when the host is already an IP literal
// (http://169.254.169.254, http://10.0.0.5, decimal forms the URL parser
// normalises), so those have to be rejected at connect time as well.
// Redirect hops open their connection through the same path.
function isBlockedLiteralHost(host?: string | null) {
  const hostname = (host || '').replace(/^\[|\]$/g, '');
  return !!net.isIP(hostname) && isBlockedIp(hostname);
}

// Connect options (timeout, allowH2, ...) belong here, not on the Agent:
// a custom `connect` function makes the Agent ignore its own connect options
const ssrfSafeConnector = buildConnector({
  lookup: ssrfSafeLookup,
} as buildConnector.BuildOptions);

export const ssrfSafeDispatcher = new Agent({
  connect: (options, callback) => {
    if (isBlockedLiteralHost(options.hostname)) {
      return callback(new Error('Blocked IP'), null);
    }
    return ssrfSafeConnector(options, callback);
  },
});

function withLiteralIpGuard<T extends http.Agent>(agent: T): T {
  const createConnection = (agent as any).createConnection.bind(agent);
  (agent as any).createConnection = (options: any, callback: any) => {
    if (isBlockedLiteralHost(options.host)) {
      return callback(new Error('Blocked IP'));
    }
    return createConnection(options, callback);
  };
  return agent;
}

// axios can't use an undici dispatcher, but Node's http(s) agents accept the
// same `lookup` hook, so axios requests (providers that need form-data /
// stream uploads) get the identical pinned-DNS guard as `this.fetch`.
// `proxy: false` because with HTTP(S)_PROXY set axios would connect to the
// proxy instead, and the target IP would never be checked. The undici
// dispatcher above already ignores those env vars.
const ssrfSafeAxios = axios.create({
  proxy: false,
  httpAgent: withLiteralIpGuard(
    new http.Agent({ lookup: ssrfSafeLookup } as http.AgentOptions)
  ),
  httpsAgent: withLiteralIpGuard(
    new https.Agent({
      lookup: ssrfSafeLookup,
    } as https.AgentOptions)
  ),
});

// Self-hosters legitimately connect Postiz to WordPress/Mastodon/Lemmy/Listmonk
// instances that live on a private network (e.g. the same Docker network or VPC).
// Setting DISABLE_SSRF_PROTECTION=true opts those deployments out of the IP
// guard. It stays ON by default so the hosted product is protected.
export function getSsrfSafeDispatcher(): Agent | undefined {
  return process.env.DISABLE_SSRF_PROTECTION === 'true'
    ? undefined
    : ssrfSafeDispatcher;
}

export function getSsrfSafeAxios(): AxiosInstance {
  return process.env.DISABLE_SSRF_PROTECTION === 'true' ? axios : ssrfSafeAxios;
}

// For SDKs that take a `fetch` implementation instead of a URL (e.g. the
// Bluesky agent), so every request they make, redirects included, goes
// through the same dispatcher.
export function getSsrfSafeFetch(): typeof fetch {
  return (input, init) =>
    fetch(input, {
      ...init,
      // @ts-ignore - undici-only option; blocks SSRF to internal IPs
      dispatcher: getSsrfSafeDispatcher(),
    });
}
