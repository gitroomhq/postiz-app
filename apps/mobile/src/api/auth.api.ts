import { apiFetch } from '@/src/api/client';

export type MobileLoginRequest = {
  email: string;
  password: string;
  provider?: 'LOCAL';
  timezone?: number;
};

export type MobileUser = {
  id: string;
  email: string;
};

export type MobileOrganization = {
  id: string;
  name: string;
};

export type MobileLoginResponse =
  | {
      login: true;
      token: string;
      organizationId: string;
      user: MobileUser;
      organization: MobileOrganization;
    }
  | {
      login: false;
      activationRequired?: boolean;
      message?: string;
    };

export function loginMobile(input: MobileLoginRequest) {
  return apiFetch<MobileLoginResponse>('/auth/mobile/login', {
    body: JSON.stringify({
      provider: 'LOCAL',
      timezone: new Date().getTimezoneOffset(),
      ...input,
    }),
    method: 'POST',
    skipAuth: true,
  });
}

export function requestPasswordReset(email: string) {
  return apiFetch<{ forgot: boolean; error?: string }>('/auth/forgot', {
    body: JSON.stringify({ email }),
    method: 'POST',
    skipAuth: true,
  });
}
