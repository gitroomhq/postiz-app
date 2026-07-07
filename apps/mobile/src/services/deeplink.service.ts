import * as Linking from 'expo-linking';

import { runtimeConfig } from '@/src/config/runtime';

export function createMobileUrl(path: string, params?: Record<string, string>) {
  return Linking.createURL(path, { queryParams: params });
}

export function getMobileCallbacks() {
  return {
    auth: runtimeConfig.mobileAuthCallback,
    integration: runtimeConfig.mobileIntegrationCallback,
  };
}
