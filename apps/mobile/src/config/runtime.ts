import Constants from 'expo-constants';

export type RuntimeConfig = {
  backendUrl: string;
  frontendUrl: string;
  mobileAuthCallback: string;
  mobileIntegrationCallback: string;
};

const extra = Constants.expoConfig?.extra ?? {};

export const runtimeConfig: RuntimeConfig = {
  backendUrl: String(extra.backendUrl ?? process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://192.168.1.195:3000'),
  frontendUrl: String(extra.frontendUrl ?? process.env.EXPO_PUBLIC_FRONTEND_URL ?? 'http://192.168.1.195:4200'),
  mobileAuthCallback: String(extra.mobileAuthCallback ?? 'postiz://auth/callback'),
  mobileIntegrationCallback: String(extra.mobileIntegrationCallback ?? 'postiz://integrations/done'),
};

export function frontendAssetUrl(path: string) {
  return `${runtimeConfig.frontendUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}
