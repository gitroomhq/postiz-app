import { apiFetch } from '@/src/api/client';

export type RegisterPushTokenRequest = {
  token: string;
  platform: string;
  deviceId?: string;
  appVersion?: string;
  buildNumber?: string;
  locale?: string;
  timezone?: string;
};

export function registerPushToken(body: RegisterPushTokenRequest) {
  return apiFetch<{ success: boolean }>('/mobile/push-token', {
    body: JSON.stringify(body),
    method: 'POST',
  });
}

export function deletePushToken(token: string) {
  return apiFetch<{ success: boolean }>('/mobile/push-token', {
    body: JSON.stringify({ token }),
    method: 'DELETE',
  });
}
