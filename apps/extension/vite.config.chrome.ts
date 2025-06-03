import { resolve } from 'path';
import { mergeConfig, defineConfig } from 'vite';
import { crx, ManifestV3Export } from '@crxjs/vite-plugin';
import baseConfig, { baseManifest, baseBuildOptions } from './vite.config.base';
import hotReloadExtension from 'hot-reload-extension-vite';

const outDir = resolve(__dirname, 'dist');
const isDev = process.env.NODE_ENV === 'development';

export default mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [
      crx({
        manifest: {
          ...baseManifest,
          background: {
            service_worker: 'src/pages/background/index.ts',
            type: 'module',
          },
        } as ManifestV3Export,
        browser: 'chrome',
        contentScripts: {
          injectCss: true,
        },
      }),
      ...(isDev
        ? [
            hotReloadExtension({
              log: true,
              backgroundPath: 'src/pages/background/index.ts',
            }),
          ]
        : []),
    ],
    build: {
      ...baseBuildOptions,
      outDir,
      ...(isDev
        ? {
            rollupOptions: {
              output: {
                entryFileNames: 'assets/[name].js',
                chunkFileNames: 'assets/[name].js',
                assetFileNames: 'assets/[name][extname]',
              },
            },
          }
        : {}),
    },
  })
);
