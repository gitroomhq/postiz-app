import { resolve } from 'path';
import { mergeConfig, defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import baseConfig, { baseManifest, baseBuildOptions } from './vite.config.base';
import hotReloadExtension from 'hot-reload-extension-vite';
const outDir = resolve(__dirname, 'dist');
const isDev = process.env.NODE_ENV === 'development';
export default mergeConfig(baseConfig, defineConfig({
    plugins: [
        crx({
            manifest: Object.assign(Object.assign({}, baseManifest), { background: {
                    service_worker: 'src/background.ts',
                    type: 'module',
                } }),
            browser: 'chrome',
            contentScripts: {
                injectCss: true,
            },
        }),
        ...(isDev
            ? [
                hotReloadExtension({
                    log: true,
                    backgroundPath: 'src/background.ts',
                }),
            ]
            : []),
    ],
    build: Object.assign(Object.assign(Object.assign({}, baseBuildOptions), { outDir }), (isDev
        ? {
            rollupOptions: {
                output: {
                    entryFileNames: 'assets/[name].js',
                    chunkFileNames: 'assets/[name].js',
                    assetFileNames: 'assets/[name][extname]',
                },
            },
        }
        : {})),
}));
//# sourceMappingURL=vite.config.chrome.js.map