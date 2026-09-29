// postmonster: jest stub - `nostr-tools` ships ESM-only builds and cannot be
// require()d from the CJS jest runtime (it is only pulled in transitively via
// integration.manager -> nostr.provider, which the tests never exercise)
module.exports = {
  getPublicKey: () => '',
  Relay: class Relay {},
  finalizeEvent: () => ({}),
  SimplePool: class SimplePool {},
};
