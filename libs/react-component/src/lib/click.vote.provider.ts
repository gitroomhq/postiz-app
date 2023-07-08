import { createContext } from 'react';

export const clickVoteContext = createContext<{
  apiUrl: undefined | string;
  publicKey: null | string;
  userId: string;
}>({
  apiUrl: typeof process === 'undefined' ? '' : process?.env?.PUBLIC_WS_URL,
  publicKey: null,
  userId: '',
});

export const ClickVoteProvider = clickVoteContext.Provider;
