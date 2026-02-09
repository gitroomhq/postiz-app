import { CookieProvider } from '../cookie-provider.interface';

export const skoolProvider: CookieProvider = {
  identifier: 'skool',
  name: 'Skool',
  url: 'https://www.skool.com',
  hostPermission: '*://*.skool.com/*',
  cookies: [
    { name: 'client_id', required: true },
    { name: 'auth_token', required: true },
  ],
};
