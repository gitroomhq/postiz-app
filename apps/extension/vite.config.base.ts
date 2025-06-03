import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { ManifestV3Export } from '@crxjs/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, BuildOptions } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { stripDevIcons, crxI18n } from './custom-vite-plugins';
import manifest from './manifest.json';
import devManifest from './manifest.dev.json';
import pkg from './package.json';
import { ProviderList } from './src/providers/provider.list';

const isDev = process.env.NODE_ENV === 'development';
// set this flag to true, if you want localization support
const localize = false;

const merge = isDev ? devManifest : ({} as ManifestV3Export);
const { matches, ...rest } = manifest?.content_scripts?.[0] || {};

export const baseManifest = {
  ...manifest,
  host_permissions: [
    ...ProviderList.map((p) => p.baseUrl + '/'),
    import.meta.env?.FRONTEND_URL || process?.env?.FRONTEND_URL + '/*',
  ],
  permissions: [...(manifest.permissions || [])],
  content_scripts: [
    {
      matches: ProviderList.reduce(
        (all, p) => [...all, p.baseUrl + '/*'],
        [import.meta.env?.FRONTEND_URL || process?.env?.FRONTEND_URL + '/*']
      ),
      ...rest,
    },
  ],
  version: pkg.version,
  ...merge,
  ...(localize
    ? {
        name: '__MSG_extName__',
        description: '__MSG_extDescription__',
        default_locale: 'en',
      }
    : {}),
} as ManifestV3Export;

export const baseBuildOptions: BuildOptions = {
  sourcemap: isDev,
  emptyOutDir: !isDev,
};

export default defineConfig({
  envPrefix: ['NEXT_PUBLIC_', 'FRONTEND_URL'],
  plugins: [
    tailwindcss(),
    tsconfigPaths(),
    react(),
    stripDevIcons(isDev),
    crxI18n({ localize, src: './src/locales' }),
  ],
  publicDir: resolve(__dirname, 'public'),
});
