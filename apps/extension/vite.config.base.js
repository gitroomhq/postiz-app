var _a, _b, _c, _d;
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { stripDevIcons, crxI18n } from './custom-vite-plugins';
import manifest from './manifest.json';
import devManifest from './manifest.dev.json';
import pkg from './package.json';
import { providers } from './src/providers/provider.registry';
const isDev = process.env.NODE_ENV === 'development';
// set this flag to true, if you want localization support
const localize = false;
const merge = isDev ? devManifest : {};
export const baseManifest = Object.assign(Object.assign(Object.assign(Object.assign({}, manifest), { host_permissions: [
        ((_a = import.meta.env) === null || _a === void 0 ? void 0 : _a.FRONTEND_URL) || ((_b = process === null || process === void 0 ? void 0 : process.env) === null || _b === void 0 ? void 0 : _b.FRONTEND_URL) + '/*',
        (((_c = import.meta.env) === null || _c === void 0 ? void 0 : _c.NEXT_PUBLIC_BACKEND_URL) || ((_d = process === null || process === void 0 ? void 0 : process.env) === null || _d === void 0 ? void 0 : _d.NEXT_PUBLIC_BACKEND_URL) || '') + '/*',
        ...providers.map(p => p.hostPermission)
    ], permissions: [...(manifest.permissions || [])], version: pkg.version }), merge), (localize
    ? {
        name: '__MSG_extName__',
        description: '__MSG_extDescription__',
        default_locale: 'en',
    }
    : {}));
export const baseBuildOptions = {
    sourcemap: isDev,
    emptyOutDir: !isDev,
};
export default defineConfig({
    envPrefix: ['NEXT_PUBLIC_', 'FRONTEND_URL', 'NEXT_PUBLIC_BACKEND_URL'],
    plugins: [
        tsconfigPaths(),
        react(),
        stripDevIcons(isDev),
        crxI18n({ localize, src: './src/locales' }),
    ],
    publicDir: resolve(__dirname, 'public'),
});
//# sourceMappingURL=vite.config.base.js.map