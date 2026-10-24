import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Mirrors `compilerOptions.paths` in tsconfig.base.json.
 *
 * The `@langchain/langgraph/prebuilt` entry is deliberately not reproduced: it
 * maps a bare specifier onto a .d.ts file, so it is a types-only shim. Aliasing
 * it here would make Vitest try to execute a declaration file.
 *
 * These are hand-written rather than derived by vite-tsconfig-paths because the
 * repo has eight tsconfigs with different module/target/jsx settings and
 * libraries/helpers has none at all, so which `paths` map applied to a given
 * file would depend on directory discovery order. Keep in sync with
 * tsconfig.base.json by hand.
 */
export const aliases = [
  {
    find: /^@gitroom\/backend\/(.*)$/,
    replacement: resolve(root, 'apps/backend/src/$1'),
  },
  {
    find: /^@gitroom\/frontend\/(.*)$/,
    replacement: resolve(root, 'apps/frontend/src/$1'),
  },
  {
    find: /^@gitroom\/orchestrator\/(.*)$/,
    replacement: resolve(root, 'apps/orchestrator/src/$1'),
  },
  {
    find: /^@gitroom\/extension\/(.*)$/,
    replacement: resolve(root, 'apps/extension/src/$1'),
  },
  {
    find: /^@gitroom\/helpers\/(.*)$/,
    replacement: resolve(root, 'libraries/helpers/src/$1'),
  },
  {
    find: /^@gitroom\/nestjs-libraries\/(.*)$/,
    replacement: resolve(root, 'libraries/nestjs-libraries/src/$1'),
  },
  {
    find: /^@gitroom\/react\/(.*)$/,
    replacement: resolve(root, 'libraries/react-shared-libraries/src/$1'),
  },
  {
    find: /^@gitroom\/testing\/(.*)$/,
    replacement: resolve(root, 'libraries/testing/src/$1'),
  },
];
