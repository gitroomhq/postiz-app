import { nip19 } from 'nostr-tools';
import { formatNostrMention } from './nostr.mention';

describe('formatNostrMention', () => {
  it('formats a hex public key as a NIP-21 nostr URI', () => {
    const pubkey = 'f'.repeat(64);

    expect(formatNostrMention(pubkey, 'alice')).toBe(
      `nostr:${nip19.npubEncode(pubkey)}`
    );
  });

  it('falls back to a readable mention for an invalid public key', () => {
    expect(formatNostrMention('invalid', '@alice')).toBe('@alice');
  });
});
