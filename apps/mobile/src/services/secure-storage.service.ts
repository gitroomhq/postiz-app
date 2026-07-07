import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'postiz.auth.token';
const ORG_ID_KEY = 'postiz.selected.org';
const PUSH_TOKEN_KEY = 'postiz.push.token';
const PUSH_DEVICE_ID_KEY = 'postiz.push.device.id';

const memoryStorage = new Map<string, string>();

function canUseLocalStorage() {
  return Platform.OS === 'web' && typeof globalThis.localStorage !== 'undefined';
}

async function getItem(key: string) {
  if (canUseLocalStorage()) {
    return globalThis.localStorage.getItem(key);
  }

  if (Platform.OS === 'web') {
    return memoryStorage.get(key) ?? null;
  }

  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string) {
  if (canUseLocalStorage()) {
    globalThis.localStorage.setItem(key, value);
    return;
  }

  if (Platform.OS === 'web') {
    memoryStorage.set(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string) {
  if (canUseLocalStorage()) {
    globalThis.localStorage.removeItem(key);
    return;
  }

  if (Platform.OS === 'web') {
    memoryStorage.delete(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

export async function saveAuthToken(token: string) {
  await setItem(AUTH_TOKEN_KEY, token);
}

export function getAuthToken() {
  return getItem(AUTH_TOKEN_KEY);
}

export async function saveSelectedOrgId(organizationId: string) {
  await setItem(ORG_ID_KEY, organizationId);
}

export function getSelectedOrgId() {
  return getItem(ORG_ID_KEY);
}

export async function saveRegisteredPushToken(token: string) {
  await setItem(PUSH_TOKEN_KEY, token);
}

export function getRegisteredPushToken() {
  return getItem(PUSH_TOKEN_KEY);
}

export async function clearRegisteredPushToken() {
  await deleteItem(PUSH_TOKEN_KEY);
}

export async function savePushDeviceId(deviceId: string) {
  await setItem(PUSH_DEVICE_ID_KEY, deviceId);
}

export function getPushDeviceId() {
  return getItem(PUSH_DEVICE_ID_KEY);
}

export async function clearAuthSession() {
  await Promise.all([
    deleteItem(AUTH_TOKEN_KEY),
    deleteItem(ORG_ID_KEY),
    deleteItem(PUSH_TOKEN_KEY),
  ]);
}
