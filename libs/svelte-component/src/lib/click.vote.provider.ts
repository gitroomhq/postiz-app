import { writable } from 'svelte/store';

export type ClickVoteProviderType = {
  apiUrl: undefined | string,
  publicKey: null | string,
  userId: string
}

// Initialize the store with default values
export const ClickVoteProvider = writable<ClickVoteProviderType>({
  apiUrl: typeof process === 'undefined' ? '' : process.env['PUBLIC_WS_URL'] || '',
  publicKey: null,
  userId: '',
});
