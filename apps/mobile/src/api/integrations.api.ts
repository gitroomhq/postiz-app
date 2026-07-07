import { apiFetch } from '@/src/api/client';

export type IntegrationListItem = {
  id: string;
  name: string;
  identifier: string;
  picture?: string;
  internalId?: string;
  disabled?: boolean;
  refreshNeeded?: boolean;
  inBetweenSteps?: boolean;
  display?: string | null;
  type?: string;
};

export type IntegrationListResponse = {
  integrations: IntegrationListItem[];
};

export type IntegrationCustomField = {
  key: string;
  label: string;
  validation: string;
  type: 'text' | 'password';
  defaultValue?: string;
  hint?: string;
};

export type AvailableIntegrationProvider = {
  identifier: string;
  name: string;
  toolTip?: string;
  isExternal?: boolean;
  isWeb3?: boolean;
  isChromeExtension?: boolean;
  customFields?: IntegrationCustomField[];
};

export type AvailableIntegrationsResponse = {
  social: AvailableIntegrationProvider[];
  article: AvailableIntegrationProvider[];
};

export type IntegrationProviderPage = {
  id?: string | number;
  pageId?: string;
  name?: string;
  username?: string;
  accountName?: string;
  locationName?: string;
  picture?: string | { data?: { url?: string } };
};

export type ConnectIntegrationResponse = {
  id?: string;
  name?: string;
  picture?: string;
  inBetweenSteps?: boolean;
  pages?: IntegrationProviderPage[];
  returnURL?: string;
  onboarding?: boolean;
};

export function getIntegrations() {
  return apiFetch<IntegrationListResponse>('/integrations/list', {
    method: 'GET',
  });
}

export function getAvailableIntegrations() {
  return apiFetch<AvailableIntegrationsResponse>('/integrations', {
    method: 'GET',
  });
}

export function startIntegrationAuth(
  identifier: string,
  params: { externalUrl?: string; redirectUrl?: string; refresh?: string } = {}
) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();

  return apiFetch<{ url?: string; err?: boolean }>(
    `/integrations/social/${identifier}${query ? `?${query}` : ''}`,
    { method: 'GET' }
  );
}

export function connectIntegration(
  identifier: string,
  body: { state: string; code: string; timezone: string; refresh?: string }
) {
  return apiFetch<ConnectIntegrationResponse>(`/integrations/social-connect/${identifier}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getIntegrationFunction<T = IntegrationProviderPage[]>(
  id: string,
  name: string,
  data: unknown = {}
) {
  return apiFetch<T>('/integrations/function', {
    method: 'POST',
    body: JSON.stringify({ data, id, name }),
  });
}

export function saveIntegrationPage(id: string, body: Record<string, unknown>) {
  return apiFetch<unknown>(`/integrations/provider/${id}/connect`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
