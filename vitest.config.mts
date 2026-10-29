import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@gitroom/helpers': fileURLToPath(
        new URL('./libraries/helpers/src', import.meta.url)
      ),
      '@gitroom/nestjs-libraries': fileURLToPath(
        new URL('./libraries/nestjs-libraries/src', import.meta.url)
      ),
    },
  },
  test: {
    include: [
      'libraries/nestjs-libraries/src/integrations/social.abstract.spec.ts',
    ],
  },
});
