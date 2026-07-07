import { apiFetch } from '@/src/api/client';
import type { RuntimeConfig } from '@/src/config/runtime';

export type MobileConfigResponse = RuntimeConfig & {
  features?: {
    pushNotifications?: boolean;
    mobileUploads?: boolean;
    analytics?: boolean;
  };
};

export function getMobileConfig() {
  return apiFetch<MobileConfigResponse>('/mobile/config', {
    method: 'GET',
    skipAuth: true,
  });
}
