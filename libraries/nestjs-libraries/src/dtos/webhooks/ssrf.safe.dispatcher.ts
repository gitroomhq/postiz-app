import { Agent, buildConnector } from 'undici';
import dns from 'node:dns';
import net from 'node:net';
import { isBlockedIp } from './webhook.url.validator';

// Pins DNS resolution: every resolved IP is checked with `isBlockedIp` and
// the caller (undici) connects to that same set. Closes the TOCTOU window
// `isSafePublicHttpsUrl` alone leaves open (see GHSA-f7jj-p389-4w45).
//
// The `lookup` hook only runs for hostnames that need DNS resolution; Node's
// net.connect skips it for literal-IP hosts (e.g. http://192.168.1.1/), so a
// literal private/loopback IP would otherwise bypass the guard entirely. We
// therefore also check literal IPs in a custom `connect`, which runs for every
// connection.
const pinnedConnector = buildConnector({
  lookup(hostname, options, callback) {
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
  },
});

export const ssrfSafeDispatcher = new Agent({
  connect(options, callback) {
    const hostname = (options.hostname || '').replace(/^\[|\]$/g, '');
    if (net.isIP(hostname) && isBlockedIp(hostname)) {
      return callback(new Error('Blocked IP'), null);
    }
    return pinnedConnector(options, callback);
  },
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
