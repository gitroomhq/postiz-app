import { Socket } from 'socket.io-client';
import { writable } from 'svelte/store';

// export type globalStateType = {
//   socket: null | Socket,
//   counter: null | number,
//   token: null | { token: string, expiration: number }
// }

export const socketStore = writable<null | Socket>(null);
export const counterStore = writable<null | number>(null);
export const tokenStore = writable<null | { token: string, expiration: number }>(null);
