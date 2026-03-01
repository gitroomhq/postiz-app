// ---- Request Types ----

export interface PingRequest {
  type: 'PING';
}

export interface GetProvidersRequest {
  type: 'GET_PROVIDERS';
}

export interface GetCookiesRequest {
  type: 'GET_COOKIES';
  provider: string;
}

export interface StoreRefreshTokenRequest {
  type: 'STORE_REFRESH_TOKEN';
  provider: string;
  integrationId: string;
  jwt: string;
  backendUrl: string;
}

export interface RemoveRefreshTokenRequest {
  type: 'REMOVE_REFRESH_TOKEN';
  integrationId: string;
}

export type ExtensionRequest =
  | PingRequest
  | GetProvidersRequest
  | GetCookiesRequest
  | StoreRefreshTokenRequest
  | RemoveRefreshTokenRequest;

// ---- Response Types ----

export interface PingResponse {
  status: 'ok';
  version: string;
}

export interface ProviderInfo {
  identifier: string;
  name: string;
  url: string;
  cookieNames: string[];
}

export interface GetProvidersResponse {
  providers: ProviderInfo[];
}

export interface GetCookiesSuccessResponse {
  success: true;
  provider: string;
  cookies: Record<string, string>;
}

export interface GetCookiesErrorResponse {
  success: false;
  provider: string;
  error: string;
  missingCookies?: string[];
}

export type GetCookiesResponse =
  | GetCookiesSuccessResponse
  | GetCookiesErrorResponse;

export interface StoredRefreshEntry {
  jwt: string;
  backendUrl: string;
  provider: string;
}

export interface ErrorResponse {
  error: string;
}

export type ExtensionResponse =
  | PingResponse
  | GetProvidersResponse
  | GetCookiesResponse
  | ErrorResponse;
