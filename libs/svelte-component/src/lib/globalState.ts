import { Socket } from 'socket.io-client';
import { writable } from 'svelte/store';

export const socketStore = writable<null | Socket>(null);
export const counterStore = writable<null | number>(null);
export const tokenStore = writable<null | { token: string, expiration: number }>(null);
