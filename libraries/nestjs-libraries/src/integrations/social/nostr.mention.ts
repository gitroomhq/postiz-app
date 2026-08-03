import { nip19 } from 'nostr-tools';

export const formatNostrMention = (pubkey: string, name: string) => {
  try {
    return `nostr:${nip19.npubEncode(pubkey)}`;
  } catch {
    return `@${name.replace(/^@/, '')}`;
  }
};
