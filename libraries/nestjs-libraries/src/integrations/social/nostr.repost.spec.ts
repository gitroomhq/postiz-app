import type { Event } from 'nostr-tools';
import { buildNostrRepostEvent } from './nostr.repost';

describe('buildNostrRepostEvent', () => {
  it('builds a NIP-18 repost that references the original note and author', () => {
    const original = {
      id: 'event-id',
      pubkey: 'author-pubkey',
      kind: 1,
      content: 'hello',
      tags: [],
      created_at: 1,
      sig: 'signature',
    } as Event;

    expect(buildNostrRepostEvent(original, 123)).toEqual({
      kind: 6,
      content: JSON.stringify(original),
      tags: [
        ['e', 'event-id'],
        ['p', 'author-pubkey'],
      ],
      created_at: 123,
    });
  });
});
