import { Platform } from 'react-native';
import * as Application from 'expo-application';

import { runtimeConfig } from '@/src/config/runtime';
import { clearAuthSession, getAuthToken, getSelectedOrgId } from '@/src/services/secure-storage.service';

type ApiFetchOptions = RequestInit & {
  skipAuth?: boolean;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  retryable?: boolean;
  details?: unknown;

  constructor(message: string, status: number, options: Pick<ApiError, 'code' | 'retryable' | 'details'> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = options.code;
    this.retryable = options.retryable;
    this.details = options.details;
  }
}

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

async function normalizeApiError(response: Response) {
  const body = await parseResponse(response).catch(() => undefined);

  if (response.status === 401 || response.status === 403) {
    await clearAuthSession();
  }

  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    return new ApiError(String(record.message ?? response.statusText), response.status, {
      code: typeof record.code === 'string' ? record.code : undefined,
      details: record.details,
      retryable: typeof record.retryable === 'boolean' ? record.retryable : undefined,
    });
  }

  return new ApiError(response.statusText || 'Request failed', response.status, { details: body });
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const token = options.skipAuth ? null : await getAuthToken();
  const organizationId = options.skipAuth ? null : await getSelectedOrgId();
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const response = await fetch(joinUrl(runtimeConfig.backendUrl, path), {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      Accept: 'application/json',
      'x-postiz-client': 'mobile',
      'x-postiz-platform': Platform.OS,
      ...(Application.nativeApplicationVersion
        ? { 'x-postiz-app-version': Application.nativeApplicationVersion }
        : {}),
      ...(Application.nativeBuildVersion
        ? { 'x-postiz-build-number': Application.nativeBuildVersion }
        : {}),
      ...(token ? { auth: token } : {}),
      ...(organizationId ? { showorg: organizationId } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw await normalizeApiError(response);
  }

  return parseResponse(response) as Promise<T>;
}
