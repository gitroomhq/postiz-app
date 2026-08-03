import type { Event } from 'nostr-tools';

export const buildNostrRepostEvent = (
  originalEvent: Event,
  createdAt = Math.floor(Date.now() / 1000)
) => ({
  kind: 6,
  content: JSON.stringify(originalEvent),
  tags: [
    ['e', originalEvent.id],
    ['p', originalEvent.pubkey],
  ],
  created_at: createdAt,
});
