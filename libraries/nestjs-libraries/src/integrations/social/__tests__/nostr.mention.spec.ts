/**
 * Lightweight unit tests for Nostr mentionFormat / NIP-27 encoding helpers.
 * Run with: npx jest nostr.mention.spec.ts (when workspace deps installed)
 */
import { nip19 } from 'nostr-tools';

function mentionFormat(idOrHandle: string, name: string) {
  try {
    if (idOrHandle.startsWith('npub1')) {
      return `nostr:${idOrHandle}`;
    }
    if (/^[0-9a-fA-F]{64}$/.test(idOrHandle)) {
      return `nostr:${nip19.npubEncode(idOrHandle.toLowerCase())}`;
    }
  } catch {
    /* fall through */
  }
  return `@${name || idOrHandle}`;
}

function extractMentionedPubkeys(message: string): string[] {
  const pubkeys: string[] = [];
  const re = /nostr:(npub1[0-9a-z]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(message || '')) !== null) {
    try {
      const decoded = nip19.decode(m[1]);
      if (decoded.type === 'npub') {
        pubkeys.push(decoded.data as string);
      }
    } catch {
      /* skip */
    }
  }
  return [...new Set(pubkeys)];
}

describe('Nostr mentionFormat (NIP-27)', () => {
  const knownPk =
    '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d';

  it('encodes hex pubkey as nostr:npub', () => {
    const out = mentionFormat(knownPk, 'fiatjaf');
    expect(out.startsWith('nostr:npub1')).toBe(true);
    const npub = out.replace('nostr:', '');
    const decoded = nip19.decode(npub);
    expect(decoded.type).toBe('npub');
    expect(decoded.data).toBe(knownPk);
  });

  it('passes through existing npub', () => {
    const npub = nip19.npubEncode(knownPk);
    expect(mentionFormat(npub, 'x')).toBe(`nostr:${npub}`);
  });

  it('extracts pubkeys from message body', () => {
    const npub = nip19.npubEncode(knownPk);
    const msg = `hello nostr:${npub} world`;
    expect(extractMentionedPubkeys(msg)).toEqual([knownPk]);
  });
});
